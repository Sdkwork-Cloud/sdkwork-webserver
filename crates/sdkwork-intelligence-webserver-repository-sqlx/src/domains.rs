use super::{EngineRow, WebRepository};
use sdkwork_webserver_contract::{
    CreateDomainRequest, CreateManagedDomainRequest, DomainPage, DomainResponse,
    DomainVerifyResponse, UpdateDomainApplicationBindingRequest, WebServiceError, WebServiceResult,
};
use sqlx::{Postgres, Row, Transaction};

use super::support::{
    bool_from_row, instant_from_row, instant_write_expression, new_uuid, next_id, now_rfc3339,
    pagination, resolve_site_internal_id, resolve_site_owner_id, store_error,
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
        let total: i64 = sqlx::query_scalar(
            "SELECT COUNT(DISTINCT d.id)
             FROM web_domain d
             INNER JOIN web_site_binding b ON b.tenant_id = d.tenant_id AND b.domain_id = d.id
             WHERE d.tenant_id = $1 AND b.site_id = $2
               AND b.deleted_at IS NULL AND b.status <> 'ARCHIVED'
               AND d.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| store_error("count application domain bindings", error))?;

        let rows = sqlx::query(&domain_select(
            "d.tenant_id = $1 AND b.site_id = $2
             AND b.deleted_at IS NULL AND b.status <> 'ARCHIVED' AND d.deleted_at IS NULL
             ORDER BY b.updated_at DESC, b.id DESC LIMIT $3 OFFSET $4",
        ))
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list application domain bindings", error))?;

        Ok(DomainPage {
            items: map_domain_rows(&rows)?,
            total,
        })
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
            "SELECT COUNT(*) FROM web_domain WHERE tenant_id = $1 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| store_error("count managed web_domain", error))?;
        let rows = sqlx::query(&domain_select(
            "d.tenant_id = $1 AND d.deleted_at IS NULL
             ORDER BY d.updated_at DESC, d.id DESC LIMIT $2 OFFSET $3",
        ))
        .bind(tenant_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list managed web_domain", error))?;

        Ok(DomainPage {
            items: map_domain_rows(&rows)?,
            total,
        })
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
        let root_domain_id: i64 = sqlx::query_scalar(
            "SELECT id FROM web_root_domain
             WHERE tenant_id = $1 AND deleted_at IS NULL
               AND ($2 = hostname OR $2 LIKE ('%.' || hostname))
             ORDER BY LENGTH(hostname) DESC, id DESC LIMIT 1",
        )
        .bind(tenant_id)
        .bind(hostname)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("resolve explicit root domain", error))?
        .ok_or_else(|| {
            WebServiceError::validation("define the matching root domain before adding a hostname")
        })?;
        let site_internal_id = match application_id {
            Some(application_id) => {
                Some(resolve_site_internal_id(&self.pool, tenant_id, application_id).await?)
            }
            None => None,
        };
        let owner_user_id = match site_internal_id {
            Some(site_id) => resolve_site_owner_id(&self.pool, tenant_id, site_id).await?,
            None => None,
        };
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let insert_time = instant_write_expression(engine, "$9");
        let insert_sql = format!(
            "INSERT INTO web_domain (
                id, uuid, tenant_id, user_id, root_domain_id, hostname, hostname_type,
                verification_status, status, metadata, created_at, updated_at, version
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, '{{}}',
                       {insert_time}, {insert_time}, 0)"
        );
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin create web_domain", error))?;
        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(owner_user_id)
            .bind(root_domain_id)
            .bind(hostname)
            .bind(if hostname.starts_with("*.") { "WILDCARD" } else { "EXACT" })
            .bind(0_i32)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("insert web_domain", error))?;

        if let Some(site_internal_id) = site_internal_id {
            self.insert_site_binding(
                &mut tx,
                tenant_id,
                site_internal_id,
                id,
                is_primary,
                ssl_enabled,
                ssl_provider,
                &now,
            )
            .await?;
        }
        tx.commit()
            .await
            .map_err(|error| store_error("commit create web_domain", error))?;
        self.retrieve_managed_domain_repo(tenant_id, &uuid).await
    }

    pub(super) async fn retrieve_domain_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        domain_id: &str,
    ) -> WebServiceResult<DomainResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let row = sqlx::query(&domain_select(
            "d.tenant_id = $1 AND d.uuid = $2 AND b.site_id = $3
             AND b.deleted_at IS NULL AND b.status <> 'ARCHIVED' AND d.deleted_at IS NULL",
        ))
        .bind(tenant_id)
        .bind(domain_id)
        .bind(site_internal_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve application domain binding", error))?
        .ok_or_else(|| WebServiceError::not_found("domain binding not found"))?;
        map_domain_row(&row)
            .map_err(|error| WebServiceError::Internal(format!("map domain binding: {error}")))
    }

    pub(super) async fn retrieve_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
    ) -> WebServiceResult<DomainResponse> {
        let row = sqlx::query(&domain_select(
            "d.tenant_id = $1 AND d.uuid = $2 AND d.deleted_at IS NULL",
        ))
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve managed web_domain", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;
        map_domain_row(&row)
            .map_err(|error| WebServiceError::Internal(format!("map managed domain: {error}")))
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
            "SELECT d.id,
                    (SELECT COUNT(*) FROM web_site_binding b
                     WHERE b.tenant_id = d.tenant_id AND b.domain_id = d.id
                       AND b.deleted_at IS NULL AND b.status <> 'ARCHIVED') AS binding_count,
                    (SELECT COUNT(*) FROM web_certificate_identifier ci
                     WHERE ci.tenant_id = d.tenant_id AND ci.domain_id = d.id) AS certificate_count
             FROM web_domain d
             WHERE d.tenant_id = $1 AND d.uuid = $2 AND d.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("load managed domain delete state", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;
        let binding_count: i64 = row.try_get("binding_count").map_err(|error| {
            store_error("map managed domain binding count", error)
        })?;
        let certificate_count: i64 = row.try_get("certificate_count").map_err(|error| {
            store_error("map managed domain certificate count", error)
        })?;
        if binding_count > 0 {
            return Err(WebServiceError::conflict(
                "domain bindings must be removed before deletion",
            ));
        }
        if certificate_count > 0 {
            return Err(WebServiceError::conflict(
                "domain certificate identifiers must be removed before deletion",
            ));
        }
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$3");
        let sql = format!(
            "UPDATE web_domain SET deleted_at = {now_expression}, updated_at = {now_expression},
                    version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL"
        );
        let result = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("delete managed domain", error))?;
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
        let domain_internal_id: i64 = sqlx::query_scalar(
            "SELECT id FROM web_domain
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("resolve managed domain binding", error))?
        .ok_or_else(|| WebServiceError::not_found("domain not found"))?;
        let now = now_rfc3339();
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin bind managed domain", error))?;
        self.insert_site_binding(
            &mut tx,
            tenant_id,
            site_internal_id,
            domain_internal_id,
            request.is_primary,
            false,
            None,
            &now,
        )
        .await?;
        tx.commit()
            .await
            .map_err(|error| store_error("commit bind managed domain", error))?;
        self.retrieve_managed_domain_repo(tenant_id, domain_id).await
    }

    pub(super) async fn unbind_managed_domain_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
        expected_application_id: Option<&str>,
    ) -> WebServiceResult<DomainResponse> {
        let expected_site_id = match expected_application_id {
            Some(application_id) => {
                Some(resolve_site_internal_id(&self.pool, tenant_id, application_id).await?)
            }
            None => None,
        };
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$4");
        let sql = format!(
            "UPDATE web_site_binding b
             SET status = 'ARCHIVED', deleted_at = {now_expression}, updated_at = {now_expression},
                 is_primary = FALSE, version = b.version + 1
             FROM web_domain d
             WHERE b.tenant_id = $1 AND d.tenant_id = b.tenant_id AND d.id = b.domain_id
               AND d.uuid = $2 AND d.deleted_at IS NULL
               AND ($3 IS NULL OR b.site_id = $3)
               AND b.environment = 'production' AND b.deleted_at IS NULL
               AND b.status <> 'ARCHIVED'"
        );
        let result = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(expected_site_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("archive managed domain binding", error))?;
        if result.rows_affected() == 0 {
            return Err(WebServiceError::not_found("domain binding not found"));
        }
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
        self.verify_domain_asset_repo(tenant_id, domain_id, None).await
    }

    async fn verify_domain_asset_repo(
        &self,
        tenant_id: i64,
        domain_id: &str,
        expected_site_id: Option<i64>,
    ) -> WebServiceResult<DomainVerifyResponse> {
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$4");
        let sql = format!(
            "UPDATE web_domain d
             SET verification_status = 'VERIFIED', verified_at = {now_expression}, status = 1,
                 updated_at = {now_expression}, version = version + 1
             WHERE d.tenant_id = $1 AND d.uuid = $2 AND d.deleted_at IS NULL
               AND ($3 IS NULL OR EXISTS (
                   SELECT 1 FROM web_site_binding b
                   WHERE b.tenant_id = d.tenant_id AND b.domain_id = d.id AND b.site_id = $3
                     AND b.deleted_at IS NULL AND b.status <> 'ARCHIVED'
               ))"
        );
        let result = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(expected_site_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("verify managed domain", error))?;
        if result.rows_affected() == 0 {
            return Err(WebServiceError::not_found("domain not found"));
        }
        let binding_time = instant_write_expression(engine, "$3");
        let binding_sql = format!(
            "UPDATE web_site_binding b SET status = 'ACTIVE', activated_at = {binding_time},
                    updated_at = {binding_time}, version = b.version + 1
             FROM web_domain d
             WHERE b.tenant_id = $1 AND d.tenant_id = b.tenant_id AND d.id = b.domain_id
               AND d.uuid = $2 AND b.status = 'PENDING' AND b.deleted_at IS NULL"
        );
        sqlx::query(&binding_sql)
            .bind(tenant_id)
            .bind(domain_id)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("activate verified domain bindings", error))?;
        Ok(DomainVerifyResponse {
            verified: true,
            verify_token: None,
        })
    }

    #[allow(clippy::too_many_arguments)]
    async fn insert_site_binding(
        &self,
        tx: &mut Transaction<'_, Postgres>,
        tenant_id: i64,
        site_id: i64,
        domain_id: i64,
        is_primary: bool,
        ssl_enabled: bool,
        ssl_provider: Option<&str>,
        now: &str,
    ) -> WebServiceResult<()> {
        let existing_site_id: Option<i64> = sqlx::query_scalar(
            "SELECT site_id FROM web_site_binding
             WHERE tenant_id = $1 AND domain_id = $2 AND environment = 'production'
               AND path_prefix = '/' AND deleted_at IS NULL AND status <> 'ARCHIVED'
             FOR UPDATE",
        )
        .bind(tenant_id)
        .bind(domain_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|error| store_error("lock domain route binding", error))?;
        if let Some(existing_site_id) = existing_site_id {
            if existing_site_id != site_id {
                return Err(WebServiceError::conflict(
                    "domain route must be unbound before binding another application",
                ));
            }
            return Err(WebServiceError::conflict(
                "domain is already bound to this application",
            ));
        }
        let engine = self.database_engine().await?;
        if is_primary {
            let clear_time = instant_write_expression(engine, "$3");
            let clear_sql = format!(
                "UPDATE web_site_binding SET is_primary = FALSE, updated_at = {clear_time},
                        version = version + 1
                 WHERE tenant_id = $1 AND site_id = $2 AND environment = 'production'
                   AND deleted_at IS NULL AND status <> 'ARCHIVED' AND is_primary = TRUE"
            );
            sqlx::query(&clear_sql)
                .bind(tenant_id)
                .bind(site_id)
                .bind(now)
                .execute(&mut **tx)
                .await
                .map_err(|error| store_error("clear primary site binding", error))?;
        }
        let binding_id = next_id(self.id_generator())?;
        let binding_uuid = new_uuid();
        let binding_time = instant_write_expression(engine, "$7");
        let binding_sql = format!(
            "INSERT INTO web_site_binding (
                id, uuid, tenant_id, site_id, domain_id, is_primary, environment,
                path_prefix, action_type, status, created_at, updated_at, version
             ) VALUES ($1, $2, $3, $4, $5, $6, 'production', '/', 'SERVE', 'PENDING',
                       {binding_time}, {binding_time}, 0)"
        );
        sqlx::query(&binding_sql)
            .bind(binding_id)
            .bind(binding_uuid)
            .bind(tenant_id)
            .bind(site_id)
            .bind(domain_id)
            .bind(is_primary)
            .bind(now)
            .execute(&mut **tx)
            .await
            .map_err(|error| store_error("insert site domain binding", error))?;

        if ssl_enabled {
            let policy_id = next_id(self.id_generator())?;
            let policy_uuid = new_uuid();
            let policy_time = instant_write_expression(engine, "$6");
            let policy_sql = format!(
                "INSERT INTO web_tls_policy (
                    id, uuid, tenant_id, site_binding_id, certificate_source,
                    created_at, updated_at, version
                 ) VALUES ($1, $2, $3, $4, $5, {policy_time}, {policy_time}, 0)"
            );
            let source = match ssl_provider {
                Some("custom") => "CUSTOM",
                Some("none") => "EXTERNAL",
                _ => "MANAGED",
            };
            sqlx::query(&policy_sql)
                .bind(policy_id)
                .bind(policy_uuid)
                .bind(tenant_id)
                .bind(binding_id)
                .bind(source)
                .bind(now)
                .execute(&mut **tx)
                .await
                .map_err(|error| store_error("insert site binding TLS policy", error))?;
        }
        Ok(())
    }
}

fn domain_select(predicate: &str) -> String {
    format!(
        "SELECT d.uuid, d.hostname, r.uuid AS root_domain_id,
                CASE WHEN d.hostname = r.hostname THEN '@'
                     ELSE LEFT(d.hostname, LENGTH(d.hostname) - LENGTH(r.hostname) - 1)
                END AS record_name,
                s.uuid AS application_id, s.name AS application_name,
                (SELECT COUNT(*) FROM web_certificate_identifier ci
                 WHERE ci.tenant_id = d.tenant_id AND ci.domain_id = d.id) AS certificate_count,
                COALESCE(b.is_primary, FALSE) AS is_primary,
                (d.verification_status = 'VERIFIED') AS is_verified,
                (p.id IS NOT NULL) AS ssl_enabled,
                CASE p.certificate_source
                    WHEN 'MANAGED' THEN 'letsencrypt'
                    WHEN 'CUSTOM' THEN 'custom'
                    WHEN 'EXTERNAL' THEN 'none'
                    ELSE NULL
                END AS ssl_provider,
                d.status, CAST(d.created_at AS TEXT) AS created_at,
                CAST(d.updated_at AS TEXT) AS updated_at
         FROM web_domain d
         INNER JOIN web_root_domain r ON r.id = d.root_domain_id
         LEFT JOIN LATERAL (
             SELECT candidate.* FROM web_site_binding candidate
             WHERE candidate.tenant_id = d.tenant_id AND candidate.domain_id = d.id
               AND candidate.environment = 'production' AND candidate.deleted_at IS NULL
               AND candidate.status <> 'ARCHIVED'
             ORDER BY (candidate.status = 'ACTIVE') DESC, candidate.updated_at DESC, candidate.id DESC
             LIMIT 1
         ) b ON TRUE
         LEFT JOIN web_site s ON s.id = b.site_id
         LEFT JOIN web_tls_policy p ON p.tenant_id = b.tenant_id
             AND p.site_binding_id = b.id AND p.status = 'ACTIVE' AND p.deleted_at IS NULL
         WHERE {predicate}"
    )
}

fn map_domain_rows(rows: &[EngineRow]) -> WebServiceResult<Vec<DomainResponse>> {
    rows.iter()
        .map(map_domain_row)
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| WebServiceError::Internal(format!("map web_domain row: {error}")))
}

fn map_domain_row(row: &EngineRow) -> Result<DomainResponse, sqlx::Error> {
    Ok(DomainResponse {
        id: row.try_get("uuid")?,
        hostname: row.try_get("hostname")?,
        root_domain_id: row.try_get("root_domain_id")?,
        record_name: row.try_get("record_name")?,
        application_id: row.try_get("application_id")?,
        application_name: row.try_get("application_name")?,
        certificate_count: row.try_get("certificate_count")?,
        is_primary: bool_from_row(row, "is_primary")?,
        is_verified: bool_from_row(row, "is_verified")?,
        ssl_enabled: bool_from_row(row, "ssl_enabled")?,
        ssl_provider: row.try_get("ssl_provider")?,
        status: row.try_get("status")?,
        latest_deployment: None,
        created_at: instant_from_row(row, "created_at")?,
        updated_at: Some(instant_from_row(row, "updated_at")?),
    })
}
