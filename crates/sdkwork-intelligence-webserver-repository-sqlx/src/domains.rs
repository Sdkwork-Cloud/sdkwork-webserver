use super::{EngineRow, WebRepository};
use sdkwork_webserver_contract::{
    CreateDomainRequest, CreateManagedDomainRequest, DomainPage, DomainResponse,
    DomainVerifyResponse, UpdateDomainApplicationBindingRequest, WebServiceError,
    WebServiceResult,
};
use sqlx::Row;

use super::support::{
    bool_from_row, instant_from_row, instant_write_expression, new_uuid, next_id, now_rfc3339,
    pagination, resolve_site_internal_id, store_error,
};

impl WebRepository {
    pub(super) async fn list_domains_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<DomainPage> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let (_page, page_size, offset) = pagination(page, page_size);

        let count_row = sqlx::query(
            "SELECT COUNT(*) AS total FROM web_domain
             WHERE tenant_id = $1 AND site_id = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| store_error("count web_domain", error))?;
        let total: i64 = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_domain count", error))?;

        let rows = sqlx::query(
            "SELECT d.uuid, d.hostname, s.uuid AS application_id,
                    s.name AS application_name,
                    (SELECT COUNT(*) FROM web_certificate c WHERE c.domain_id = d.id)
                        AS certificate_count,
                    d.is_primary, d.is_verified, d.ssl_enabled, d.ssl_provider, d.status,
                    CAST(d.created_at AS TEXT) AS created_at
             FROM web_domain d
             INNER JOIN web_site s ON s.id = d.site_id
             WHERE d.tenant_id = $1 AND d.site_id = $2 AND d.deleted_at IS NULL
             ORDER BY d.created_at DESC, d.id DESC LIMIT $3 OFFSET $4",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list web_domain", error))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in &rows {
            items.push(map_domain_row(row).map_err(|error| {
                WebServiceError::Internal(format!("map web_domain row: {error}"))
            })?);
        }

        Ok(DomainPage { items, total })
    }

    pub(super) async fn create_domain_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        request: &CreateDomainRequest,
    ) -> WebServiceResult<DomainResponse> {
        self.create_domain_asset_repo(
            tenant_id,
            Some(site_id),
            &request.hostname,
            request.is_primary,
            request.ssl_enabled,
            request.ssl_provider.as_deref(),
        )
        .await
    }

    pub(super) async fn list_managed_domains_repo(
        &self,
        tenant_id: i64,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<DomainPage> {
        let (_page, page_size, offset) = pagination(page, page_size);
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM web_domain
             WHERE tenant_id = $1 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| store_error("count managed web_domain", error))?;

        let rows = sqlx::query(
            "SELECT d.uuid, d.hostname, s.uuid AS application_id,
                    s.name AS application_name,
                    (SELECT COUNT(*) FROM web_certificate c WHERE c.domain_id = d.id)
                        AS certificate_count,
                    d.is_primary, d.is_verified, d.ssl_enabled, d.ssl_provider, d.status,
                    CAST(d.created_at AS TEXT) AS created_at
             FROM web_domain d
             LEFT JOIN web_site s ON s.id = d.site_id
             WHERE d.tenant_id = $1 AND d.deleted_at IS NULL
             ORDER BY d.created_at DESC, d.id DESC LIMIT $2 OFFSET $3",
        )
        .bind(tenant_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list managed web_domain", error))?;

        let items = rows
            .iter()
            .map(map_domain_row)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| WebServiceError::Internal(format!("map web_domain row: {error}")))?;

        Ok(DomainPage { items, total })
    }

    pub(super) async fn create_managed_domain_repo(
        &self,
        tenant_id: i64,
        request: &CreateManagedDomainRequest,
    ) -> WebServiceResult<DomainResponse> {
        self.create_domain_asset_repo(
            tenant_id,
            request.application_id.as_deref(),
            &request.hostname,
            request.is_primary,
            request.ssl_enabled,
            request.ssl_provider.as_deref(),
        )
        .await
    }

    async fn create_domain_asset_repo(
        &self,
        tenant_id: i64,
        application_id: Option<&str>,
        hostname: &str,
        is_primary: bool,
        ssl_enabled: bool,
        ssl_provider: Option<&str>,
    ) -> WebServiceResult<DomainResponse> {
        if application_id.is_none() && is_primary {
            return Err(WebServiceError::validation(
                "an unbound domain cannot be primary",
            ));
        }
        let site_internal_id = match application_id {
            Some(application_id) => Some(
                resolve_site_internal_id(&self.pool, tenant_id, application_id).await?,
            ),
            None => None,
        };
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let verify_token = new_uuid();
        let engine = self.database_engine().await?;
        let clear_primary_time = instant_write_expression(engine, "$3");
        let insert_time = instant_write_expression(engine, "$10");
        let clear_primary_sql = format!(
            "UPDATE web_domain SET is_primary = FALSE, updated_at = {clear_primary_time}
             WHERE tenant_id = $1 AND site_id = $2 AND deleted_at IS NULL"
        );
        let insert_sql = format!(
            "INSERT INTO web_domain (
                id, uuid, tenant_id, site_id, hostname, is_primary, is_verified, verify_token,
                ssl_enabled, ssl_provider, status, metadata, created_at, updated_at, version
             ) VALUES (
                $1, $2, $3, $4, $5, $6, FALSE, $7, $8, $9, 0, '{{}}',
                {insert_time}, {insert_time}, 0
             )"
        );

        // 事务边界：清除旧 primary + 插入新 domain 必须原子完成，
        // 避免清除成功但插入失败导致站点丢失主域名。
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin create web_domain transaction", error))?;

        if is_primary {
            sqlx::query(&clear_primary_sql)
                .bind(tenant_id)
                .bind(site_internal_id.expect("primary domains have an application binding"))
                .bind(&now)
                .execute(&mut *tx)
                .await
                .map_err(|error| store_error("clear primary web_domain", error))?;
        }

        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(site_internal_id)
            .bind(hostname)
            .bind(is_primary)
            .bind(&verify_token)
            .bind(ssl_enabled)
            .bind(ssl_provider)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("insert web_domain", error))?;

        tx.commit()
            .await
            .map_err(|error| store_error("commit create web_domain transaction", error))?;

        self.retrieve_managed_domain_repo(tenant_id, &uuid).await
    }

    pub(super) async fn retrieve_domain_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<DomainResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let row = sqlx::query(
            "SELECT d.uuid, d.hostname, s.uuid AS application_id,
                    s.name AS application_name,
                    (SELECT COUNT(*) FROM web_certificate c WHERE c.domain_id = d.id)
                        AS certificate_count,
                    d.is_primary, d.is_verified, d.ssl_enabled, d.ssl_provider, d.status,
                    CAST(d.created_at AS TEXT) AS created_at
             FROM web_domain d
             INNER JOIN web_site s ON s.id = d.site_id
             WHERE d.tenant_id = $1 AND d.site_id = $2 AND d.uuid = $3
               AND d.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(domain_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve web_domain", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;

        map_domain_row(&row).map_err(|error| WebServiceError::Internal(error.to_string()))
    }

    pub(super) async fn retrieve_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
    ) -> WebServiceResult<DomainResponse> {
        let row = sqlx::query(
            "SELECT d.uuid, d.hostname, s.uuid AS application_id,
                    s.name AS application_name,
                    (SELECT COUNT(*) FROM web_certificate c WHERE c.domain_id = d.id)
                        AS certificate_count,
                    d.is_primary, d.is_verified, d.ssl_enabled, d.ssl_provider, d.status,
                    CAST(d.created_at AS TEXT) AS created_at
             FROM web_domain d
             LEFT JOIN web_site s ON s.id = d.site_id
             WHERE d.tenant_id = $1 AND d.uuid = $2 AND d.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve managed web_domain", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;

        map_domain_row(&row).map_err(|error| WebServiceError::Internal(error.to_string()))
    }

    pub(super) async fn delete_domain_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<()> {
        self.unbind_managed_domain_repo(tenant_id, domain_id, Some(site_id))
            .await
            .map(|_| ())
    }

    pub(super) async fn delete_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
    ) -> WebServiceResult<()> {
        let row = sqlx::query(
            "SELECT d.site_id,
                    (SELECT COUNT(*) FROM web_certificate c WHERE c.domain_id = d.id)
                        AS certificate_count
             FROM web_domain d
             WHERE d.tenant_id = $1 AND d.uuid = $2 AND d.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("load managed web_domain delete state", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;
        let site_id: Option<i64> = row
            .try_get("site_id")
            .map_err(|error| store_error("map managed web_domain site_id", error))?;
        let certificate_count: i64 = row
            .try_get("certificate_count")
            .map_err(|error| store_error("map managed web_domain certificate count", error))?;
        if site_id.is_some() {
            return Err(WebServiceError::conflict(
                "domain must be unbound before deletion",
            ));
        }
        if certificate_count > 0 {
            return Err(WebServiceError::conflict(
                "domain certificates must be removed before deletion",
            ));
        }

        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$3");
        let update_sql = format!(
            "UPDATE web_domain
             SET deleted_at = {now_expression}, updated_at = {now_expression},
                 version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND site_id IS NULL AND deleted_at IS NULL"
        );
        let result = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("delete web_domain", error))?;

        if result.rows_affected() == 0 {
            return Err(WebServiceError::not_found("domain not found"));
        }
        Ok(())
    }

    pub(super) async fn bind_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
        request: &UpdateDomainApplicationBindingRequest,
    ) -> WebServiceResult<DomainResponse> {
        let site_internal_id =
            resolve_site_internal_id(&self.pool, tenant_id, &request.application_id).await?;
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin bind web_domain transaction", error))?;
        let row = sqlx::query(
            "SELECT id, site_id FROM web_domain
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|error| store_error("load web_domain binding", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;
        let domain_internal_id: i64 = row
            .try_get("id")
            .map_err(|error| store_error("map web_domain id", error))?;
        let current_site_id: Option<i64> = row
            .try_get("site_id")
            .map_err(|error| store_error("map web_domain binding", error))?;
        if current_site_id.is_some_and(|current| current != site_internal_id) {
            return Err(WebServiceError::conflict(
                "domain must be unbound before binding another application",
            ));
        }

        if request.is_primary {
            let clear_time = instant_write_expression(engine, "$3");
            let clear_sql = format!(
                "UPDATE web_domain SET is_primary = FALSE, updated_at = {clear_time},
                        version = version + 1
                 WHERE tenant_id = $1 AND site_id = $2 AND uuid <> $4
                   AND deleted_at IS NULL AND is_primary = TRUE"
            );
            sqlx::query(&clear_sql)
                .bind(tenant_id)
                .bind(site_internal_id)
                .bind(&now)
                .bind(domain_id)
                .execute(&mut *tx)
                .await
                .map_err(|error| store_error("clear primary web_domain on bind", error))?;
        }

        let domain_time = instant_write_expression(engine, "$5");
        let domain_sql = format!(
            "UPDATE web_domain
             SET site_id = $3, is_primary = $4, updated_at = {domain_time},
                 version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL
               AND (site_id IS NULL OR site_id = $3)"
        );
        let result = sqlx::query(&domain_sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(site_internal_id)
            .bind(request.is_primary)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("bind web_domain", error))?;
        if result.rows_affected() == 0 {
            return Err(WebServiceError::conflict(
                "domain binding changed concurrently",
            ));
        }

        let certificate_time = instant_write_expression(engine, "$4");
        let certificate_sql = format!(
            "UPDATE web_certificate
             SET site_id = $3, updated_at = {certificate_time}, version = version + 1
             WHERE tenant_id = $1 AND domain_id = $2"
        );
        sqlx::query(&certificate_sql)
            .bind(tenant_id)
            .bind(domain_internal_id)
            .bind(site_internal_id)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("bind web_certificate application scope", error))?;

        tx.commit()
            .await
            .map_err(|error| store_error("commit bind web_domain transaction", error))?;
        self.retrieve_managed_domain_repo(tenant_id, domain_id).await
    }

    pub(super) async fn unbind_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
        expected_application_id: Option<&str>,
    ) -> WebServiceResult<DomainResponse> {
        let expected_site_internal_id = match expected_application_id {
            Some(application_id) => Some(
                resolve_site_internal_id(&self.pool, tenant_id, application_id).await?,
            ),
            None => None,
        };
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin unbind web_domain transaction", error))?;
        let row = sqlx::query(
            "SELECT id, site_id FROM web_domain
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|error| store_error("load web_domain unbinding", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;
        let domain_internal_id: i64 = row
            .try_get("id")
            .map_err(|error| store_error("map web_domain id", error))?;
        let current_site_id: Option<i64> = row
            .try_get("site_id")
            .map_err(|error| store_error("map web_domain binding", error))?;
        if let (Some(expected), Some(current)) = (expected_site_internal_id, current_site_id) {
            if expected != current {
                return Err(WebServiceError::conflict(
                    "domain is bound to another application",
                ));
            }
        }

        let domain_time = instant_write_expression(engine, "$3");
        let domain_sql = format!(
            "UPDATE web_domain
             SET site_id = NULL, is_primary = FALSE, updated_at = {domain_time},
                 version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL"
        );
        sqlx::query(&domain_sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("unbind web_domain", error))?;

        let certificate_time = instant_write_expression(engine, "$3");
        let certificate_sql = format!(
            "UPDATE web_certificate
             SET site_id = NULL, updated_at = {certificate_time}, version = version + 1
             WHERE tenant_id = $1 AND domain_id = $2"
        );
        sqlx::query(&certificate_sql)
            .bind(tenant_id)
            .bind(domain_internal_id)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("unbind web_certificate application scope", error))?;

        tx.commit()
            .await
            .map_err(|error| store_error("commit unbind web_domain transaction", error))?;
        self.retrieve_managed_domain_repo(tenant_id, domain_id).await
    }

    pub(super) async fn verify_domain_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<DomainVerifyResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        self.verify_domain_asset_repo(tenant_id, domain_id, Some(site_internal_id))
            .await
    }

    pub(super) async fn verify_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
    ) -> WebServiceResult<DomainVerifyResponse> {
        self.verify_domain_asset_repo(tenant_id, domain_id, None)
            .await
    }

    async fn verify_domain_asset_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
        expected_site_internal_id: Option<i64>,
    ) -> WebServiceResult<DomainVerifyResponse> {
        let row = sqlx::query(
            "SELECT is_verified, verify_token FROM web_domain
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL
               AND ($3 IS NULL OR site_id = $3)",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .bind(expected_site_internal_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("verify web_domain lookup", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;

        let is_verified = bool_from_row(&row, "is_verified")
            .map_err(|error| store_error("map web_domain is_verified", error))?;
        let verify_token: Option<String> = row
            .try_get("verify_token")
            .map_err(|error| store_error("map web_domain verify_token", error))?;

        if is_verified {
            return Ok(DomainVerifyResponse {
                verified: true,
                verify_token: None,
            });
        }

        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$4");
        let update_sql = format!(
            "UPDATE web_domain
             SET is_verified = TRUE, status = 1, updated_at = {now_expression},
                 version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL
               AND ($3 IS NULL OR site_id = $3)"
        );
        sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(expected_site_internal_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("verify web_domain", error))?;

        Ok(DomainVerifyResponse {
            verified: true,
            verify_token,
        })
    }
}

fn map_domain_row(row: &EngineRow) -> Result<DomainResponse, sqlx::Error> {
    Ok(DomainResponse {
        id: row.try_get("uuid")?,
        hostname: row.try_get("hostname")?,
        application_id: row.try_get("application_id")?,
        application_name: row.try_get("application_name")?,
        certificate_count: row.try_get("certificate_count")?,
        is_primary: bool_from_row(row, "is_primary")?,
        is_verified: bool_from_row(row, "is_verified")?,
        ssl_enabled: bool_from_row(row, "ssl_enabled")?,
        ssl_provider: row.try_get("ssl_provider")?,
        status: row.try_get("status")?,
        created_at: instant_from_row(row, "created_at")?,
    })
}
