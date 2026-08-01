use super::{EngineRow, WebRepository};
use sdkwork_utils_rust::slugify;
use sdkwork_webserver_contract::{
    ApplicationStoreListing, CreateSiteRequest, ListSitesQuery, SitePage, SiteResponse,
    UpdateSiteRequest, WebServiceError, WebServiceResult,
};
use sqlx::Row;

use super::support::{
    instant_from_row, instant_write_expression, json_from_row, json_write_expression, new_uuid,
    next_id, now_rfc3339, pagination, resolve_site_internal_id, store_error,
};

impl WebRepository {
    pub(super) async fn list_sites_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        query: &ListSitesQuery,
    ) -> WebServiceResult<SitePage> {
        let (page, page_size, offset) = pagination(query.page, query.page_size)?;
        let keyword = query
            .keyword
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(|value| format!("%{value}%"));
        let count_sql = "SELECT COUNT(*) AS total FROM web_site
             WHERE tenant_id = $1 AND deleted_at IS NULL
               AND ($2 IS NULL OR status = $2)
               AND ($3 IS NULL OR application_type = $3)
               AND ($4 IS NULL OR site_type = $4)
               AND ($5 IS NULL OR name LIKE $5 OR slug LIKE $5)
               AND ($6 IS NULL OR (data_scope = 3 AND user_id = $6))";
        let list_sql = "SELECT uuid, name, slug, description, application_type, site_type, status,
                    CAST(runtime_config AS TEXT) AS runtime_config,
                    CAST(metadata AS TEXT) AS metadata,
                    CAST(created_at AS TEXT) AS created_at,
                    CAST(updated_at AS TEXT) AS updated_at
             FROM web_site
             WHERE tenant_id = $1 AND deleted_at IS NULL
               AND ($2 IS NULL OR status = $2)
               AND ($3 IS NULL OR application_type = $3)
               AND ($4 IS NULL OR site_type = $4)
               AND ($5 IS NULL OR name LIKE $5 OR slug LIKE $5)
               AND ($6 IS NULL OR (data_scope = 3 AND user_id = $6))
             ORDER BY updated_at DESC, id DESC LIMIT $7 OFFSET $8";

        let count_query = sqlx::query(count_sql)
            .bind(tenant_id)
            .bind(query.status)
            .bind(query.application_type.as_deref())
            .bind(query.site_type)
            .bind(keyword.as_deref())
            .bind(owner_id);
        let list_query = sqlx::query(list_sql)
            .bind(tenant_id)
            .bind(query.status)
            .bind(query.application_type.as_deref())
            .bind(query.site_type)
            .bind(keyword.as_deref())
            .bind(owner_id)
            .bind(page_size)
            .bind(offset);

        let count_row = count_query
            .fetch_one(&self.pool)
            .await
            .map_err(|error| store_error("count web_site", error))?;
        let total: i64 = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_site count", error))?;

        let rows = list_query
            .fetch_all(&self.pool)
            .await
            .map_err(|error| store_error("list web_site", error))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in &rows {
            items.push(map_site_row(row).map_err(|error| {
                WebServiceError::Internal(format!("map web_site row: {error}"))
            })?);
        }

        Ok(SitePage {
            items,
            total,
            page,
            page_size,
        })
    }

    pub(super) async fn create_site_repo(
        &self,
        tenant_id: i64,
        organization_id: Option<i64>,
        owner_id: Option<i64>,
        request: &CreateSiteRequest,
    ) -> WebServiceResult<SiteResponse> {
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let slug = request
            .slug
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .map(slugify)
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| slugify(&request.name));
        if slug.is_empty() {
            return Err(WebServiceError::validation("slug cannot be empty"));
        }
        let now = now_rfc3339();
        let runtime_config = request
            .runtime_config
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let metadata = request
            .store_listing
            .as_ref()
            .map(|store_listing| serde_json::json!({ "storeListing": store_listing }))
            .unwrap_or_else(|| serde_json::json!({}));
        let org_id = organization_id.unwrap_or(0);
        let data_scope = if owner_id.is_some() { 3 } else { 1 };
        let engine = self.database_engine().await?;
        let runtime_config_expression = json_write_expression(engine, "$12");
        let metadata_expression = json_write_expression(engine, "$13");
        let now_expression = instant_write_expression(engine, "$14");
        let insert_sql = format!(
            "INSERT INTO web_site (
                id, uuid, tenant_id, organization_id, data_scope, user_id, name, slug, description,
                application_type, site_type, status, runtime_config, metadata, created_at, updated_at, version
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0,
                {runtime_config_expression}, {metadata_expression}, {now_expression}, {now_expression}, 0
             )"
        );

        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(org_id)
            .bind(data_scope)
            .bind(owner_id)
            .bind(&request.name)
            .bind(&slug)
            .bind(&request.description)
            .bind(&request.application_type)
            .bind(request.site_type)
            .bind(runtime_config.to_string())
            .bind(metadata.to_string())
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("insert web_site", error))?;

        self.retrieve_site_repo(tenant_id, owner_id, &uuid).await
    }

    pub(super) async fn retrieve_site_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        site_id: &str,
    ) -> WebServiceResult<SiteResponse> {
        let row = sqlx::query(
            "SELECT uuid, name, slug, description, application_type, site_type, status,
                    CAST(runtime_config AS TEXT) AS runtime_config,
                    CAST(metadata AS TEXT) AS metadata,
                    CAST(created_at AS TEXT) AS created_at,
                    CAST(updated_at AS TEXT) AS updated_at
             FROM web_site
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL
               AND ($3 IS NULL OR (data_scope = 3 AND user_id = $3))",
        )
        .bind(tenant_id)
        .bind(site_id)
        .bind(owner_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve web_site", error))?
        .ok_or_else(|| WebServiceError::not_found("site not found"))?;

        map_site_row(&row).map_err(|error| WebServiceError::Internal(error.to_string()))
    }

    pub(super) async fn update_site_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        request: &UpdateSiteRequest,
    ) -> WebServiceResult<SiteResponse> {
        let existing = self.retrieve_site_repo(tenant_id, None, site_id).await?;
        let current_version = self.retrieve_site_version_repo(tenant_id, site_id).await?;
        let name = request.name.as_ref().unwrap_or(&existing.name);
        let description = request
            .description
            .as_ref()
            .or(existing.description.as_ref());
        let runtime_config = request
            .runtime_config
            .clone()
            .or(existing.runtime_config)
            .unwrap_or_else(|| serde_json::json!({}));
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let runtime_config_expression = json_write_expression(engine, "$5");
        let store_listing_json = request
            .store_listing
            .as_ref()
            .map(serde_json::to_string)
            .transpose()
            .map_err(|error| WebServiceError::Internal(format!("serialize store listing: {error}")))?;
        let metadata_expression = match engine {
            sdkwork_database_config::DatabaseEngine::Sqlite => {
                "CASE WHEN $6 IS NULL THEN metadata ELSE json_set(metadata, '$.storeListing', json($6)) END"
                    .to_string()
            }
            sdkwork_database_config::DatabaseEngine::Postgres => {
                "CASE WHEN $6 IS NULL THEN metadata ELSE jsonb_set(metadata, '{storeListing}', CAST($6 AS JSONB), true) END"
                    .to_string()
            }
        };
        let now_expression = instant_write_expression(engine, "$7");
        let update_sql = format!(
            "UPDATE web_site
             SET name = $3, description = $4, runtime_config = {runtime_config_expression},
                 metadata = {metadata_expression},
                 updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL AND version = $8"
        );

        let updated = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(site_id)
            .bind(name)
            .bind(description)
            .bind(runtime_config.to_string())
            .bind(store_listing_json)
            .bind(&now)
            .bind(current_version)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("update web_site", error))?;

        if updated.rows_affected() == 0 {
            return self.conflict_or_missing_site(tenant_id, site_id).await;
        }

        self.retrieve_site_repo(tenant_id, None, site_id).await
    }

    pub(super) async fn delete_site_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        actor_id: Option<i64>,
    ) -> WebServiceResult<()> {
        let status: i32 = sqlx::query_scalar(
            "SELECT status
             FROM web_site
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(site_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("delete web_site status lookup", error))?
        .ok_or_else(|| WebServiceError::not_found("site not found"))?;

        if status == 1 {
            return Err(WebServiceError::conflict(
                "active applications must be disabled before deletion",
            ));
        }

        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$3");
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin delete web_site transaction", error))?;

        let site_update = sqlx::query(&format!(
            "UPDATE web_site
             SET deleted_at = {now_expression}, deleted_by = $4,
                 updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL AND status <> 1"
        ))
        .bind(tenant_id)
        .bind(site_id)
        .bind(&now)
        .bind(actor_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("delete web_site", error))?;

        if site_update.rows_affected() == 0 {
            tx.rollback().await.map_err(|error| {
                store_error("rollback delete web_site transaction", error)
            })?;
            return Err(WebServiceError::conflict(
                "application state changed; disable it before deletion",
            ));
        }

        // Archive the site's owned route surface so deleted applications never
        // keep occupying domain routes, TLS policies, or listener bindings.
        sqlx::query(&format!(
            "UPDATE web_site_binding
             SET status = 'ARCHIVED', deleted_at = {now_expression},
                 updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND site_id = $2 AND deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("archive web_site bindings", error))?;
        sqlx::query(&format!(
            "UPDATE web_tls_policy policy
             SET status = 'ARCHIVED', deleted_at = {now_expression},
                 updated_at = {now_expression}, version = version + 1
             FROM web_site_binding binding
             WHERE binding.tenant_id = policy.tenant_id
               AND binding.id = policy.site_binding_id
               AND binding.tenant_id = $1 AND binding.site_id = $2
               AND policy.deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("archive web_site TLS policies", error))?;
        sqlx::query(&format!(
            "UPDATE web_listener_certificate_binding listener
             SET status = 'ARCHIVED', deleted_at = {now_expression},
                 updated_at = {now_expression}, version = version + 1
             FROM web_site_binding binding
             WHERE binding.tenant_id = listener.tenant_id
               AND binding.id = listener.site_binding_id
               AND binding.tenant_id = $1 AND binding.site_id = $2
               AND listener.deleted_at IS NULL"
        ))
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("archive web_site listener certificate bindings", error))?;
        // Deactivate the site's environment variables and health checks.
        sqlx::query(&format!(
            "UPDATE web_env_variable
             SET status = 0, updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND site_id = $2 AND status = 1"
        ))
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("deactivate web_site environment variables", error))?;
        sqlx::query(&format!(
            "UPDATE web_health_check
             SET status = 0, updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND site_id = $2 AND status = 1"
        ))
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("deactivate web_site health checks", error))?;

        tx.commit()
            .await
            .map_err(|error| store_error("commit delete web_site transaction", error))?;
        Ok(())
    }

    pub(super) async fn set_site_status_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        status: i32,
    ) -> WebServiceResult<SiteResponse> {
        let current_version = self.retrieve_site_version_repo(tenant_id, site_id).await?;
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$4");
        let update_sql = format!(
            "UPDATE web_site
             SET status = $3, updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL AND version = $5"
        );
        let result = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(site_id)
            .bind(status)
            .bind(&now)
            .bind(current_version)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("update web_site status", error))?;

        if result.rows_affected() == 0 {
            return self.conflict_or_missing_site(tenant_id, site_id).await;
        }

        self.retrieve_site_repo(tenant_id, None, site_id).await
    }

    /// Reads the current optimistic-concurrency version of a live site row.
    pub(super) async fn retrieve_site_version_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
    ) -> WebServiceResult<i64> {
        sqlx::query_scalar(
            "SELECT version FROM web_site
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(site_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("load web_site version", error))?
        .ok_or_else(|| WebServiceError::not_found("site not found"))
    }

    /// Distinguishes a concurrent-write conflict from a missing row after a
    /// compare-and-swap update affected zero rows.
    async fn conflict_or_missing_site(
        &self,
        tenant_id: i64,
        site_id: &str,
    ) -> WebServiceResult<SiteResponse> {
        if self.retrieve_site_version_repo(tenant_id, site_id).await.is_ok() {
            return Err(WebServiceError::conflict(
                "site was modified concurrently; reload and retry",
            ));
        }
        Err(WebServiceError::not_found("site not found"))
    }
}

fn map_site_row(row: &EngineRow) -> Result<SiteResponse, sqlx::Error> {
    Ok(SiteResponse {
        id: row.try_get("uuid")?,
        name: row.try_get("name")?,
        slug: row.try_get("slug")?,
        description: row.try_get("description")?,
        application_type: row.try_get("application_type")?,
        site_type: row.try_get("site_type")?,
        status: row.try_get("status")?,
        runtime_config: json_from_row(row, "runtime_config")?,
        store_listing: store_listing_from_row(row)?,
        created_at: instant_from_row(row, "created_at")?,
        updated_at: instant_from_row(row, "updated_at")?,
    })
}

fn store_listing_from_row(row: &EngineRow) -> Result<Option<ApplicationStoreListing>, sqlx::Error> {
    let Some(metadata) = json_from_row(row, "metadata")? else {
        return Ok(None);
    };
    metadata
        .get("storeListing")
        .cloned()
        .map(serde_json::from_value)
        .transpose()
        .map_err(|error| sqlx::Error::Decode(Box::new(error)))
}
