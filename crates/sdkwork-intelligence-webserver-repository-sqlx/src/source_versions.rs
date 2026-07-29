use super::{EngineRow, WebRepository};
use sdkwork_webserver_contract::{
    CreateSourceVersionRequest, SourceVersionPage,
    SourceVersionResponse, WebServiceError, WebServiceResult,
};
use sqlx::Row;

use super::support::{
    instant_from_row, instant_write_expression, json_from_row, json_write_expression, new_uuid,
    next_id, now_rfc3339, pagination, resolve_site_internal_id, store_error,
};

impl WebRepository {
    pub(super) async fn list_source_versions_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<SourceVersionPage> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let (page, page_size, offset) = pagination(page, page_size);
        let count_row = sqlx::query(
            "SELECT COUNT(*) AS total FROM web_source_version
             WHERE tenant_id = $1 AND site_id = $2",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| store_error("count web_source_version", error))?;
        let rows = sqlx::query(
            "SELECT uuid, version_tag, source_type, source_ref, commit_hash, artifact_path,
                    artifact_size, artifact_hash, CAST(config_snapshot AS TEXT) AS config_snapshot,
                    status, CAST(created_at AS TEXT) AS created_at
             FROM web_source_version
             WHERE tenant_id = $1 AND site_id = $2
             ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list web_source_version", error))?;

        let total = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_source_version count", error))?;
        let items = rows
            .iter()
            .map(|row| map_source_version_row(row, site_id))
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| WebServiceError::Internal(format!("map web_source_version: {error}")))?;
        Ok(SourceVersionPage {
            items,
            total,
            page,
            page_size,
        })
    }

    pub(super) async fn create_source_version_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        actor_id: Option<i64>,
        retention_limit: i32,
        request: &CreateSourceVersionRequest,
    ) -> WebServiceResult<SourceVersionResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let instant_expression = instant_write_expression(engine, "$14");
        let config_expression = json_write_expression(engine, "$13");
        let config_snapshot = serde_json::to_string(&request.config_snapshot)
            .map_err(|error| WebServiceError::Internal(error.to_string()))?;
        let insert_sql = format!(
            "INSERT INTO web_source_version (
                id, uuid, tenant_id, organization_id, user_id, site_id, version_tag,
                source_type, source_ref, commit_hash, artifact_path, artifact_size,
                artifact_hash, config_snapshot, status, metadata, created_at, updated_at, version
             ) VALUES (
                $1, $2, $3,
                COALESCE((SELECT organization_id FROM web_site WHERE tenant_id = $3 AND id = $5), 0),
                $4, $5, $6, $7, $8, $9, $10, $11, $12, {config_expression}, 1, '{{}}',
                {instant_expression}, {instant_expression}, 0
             )"
        );
        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(actor_id)
            .bind(site_internal_id)
            .bind(request.version_tag.trim())
            .bind(request.source_type.trim())
            .bind(normalized_optional(request.source_ref.as_deref()))
            .bind(normalized_optional(request.commit_hash.as_deref()))
            .bind(request.artifact_drive_uri.trim())
            .bind(request.artifact_size)
            .bind(request.artifact_hash.trim())
            .bind(&config_snapshot)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("insert web_source_version", error))?;

        self.prune_source_versions_repo(tenant_id, site_internal_id, actor_id, retention_limit)
            .await?;
        self.retrieve_source_version_repo(tenant_id, site_id, &uuid)
            .await
    }

    pub(super) async fn retrieve_source_version_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        source_version_id: &str,
    ) -> WebServiceResult<SourceVersionResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let row = sqlx::query(
            "SELECT uuid, version_tag, source_type, source_ref, commit_hash, artifact_path,
                    artifact_size, artifact_hash, CAST(config_snapshot AS TEXT) AS config_snapshot,
                    status, CAST(created_at AS TEXT) AS created_at
             FROM web_source_version
             WHERE tenant_id = $1 AND site_id = $2 AND uuid = $3",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(source_version_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve web_source_version", error))?
        .ok_or_else(|| WebServiceError::not_found("source version not found"))?;
        map_source_version_row(&row, site_id)
            .map_err(|error| WebServiceError::Internal(format!("map web_source_version: {error}")))
    }

    async fn prune_source_versions_repo(
        &self,
        tenant_id: i64,
        site_internal_id: i64,
        actor_id: Option<i64>,
        retention_limit: i32,
    ) -> WebServiceResult<()> {
        let rows = sqlx::query(
            "SELECT id FROM web_source_version
             WHERE tenant_id = $1 AND site_id = $2 AND status = 1
             ORDER BY created_at DESC, id DESC LIMIT 100 OFFSET $3",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(retention_limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("select retained web_source_version", error))?;
        if rows.is_empty() {
            return Ok(());
        }
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let instant_expression = instant_write_expression(engine, "$4");
        for row in rows {
            let id: i64 = row
                .try_get("id")
                .map_err(|error| store_error("map pruned web_source_version id", error))?;
            let update_sql = format!(
                "UPDATE web_source_version
                 SET status = 3, pruned_at = {instant_expression}, pruned_by = $3,
                     updated_at = {instant_expression}, version = version + 1
                 WHERE tenant_id = $1 AND id = $2 AND status = 1"
            );
            sqlx::query(&update_sql)
                .bind(tenant_id)
                .bind(id)
                .bind(actor_id)
                .bind(&now)
                .execute(&self.pool)
                .await
                .map_err(|error| store_error("prune web_source_version", error))?;
        }
        Ok(())
    }
}

fn map_source_version_row(
    row: &EngineRow,
    site_id: &str,
) -> Result<SourceVersionResponse, sqlx::Error> {
    let status: i32 = row.try_get("status")?;
    let config_snapshot = json_from_row(row, "config_snapshot")?
        .map(serde_json::from_value)
        .transpose()
        .map_err(|error| sqlx::Error::Decode(Box::new(error)))?
        .unwrap_or_default();
    Ok(SourceVersionResponse {
        id: row.try_get("uuid")?,
        site_id: site_id.to_string(),
        version_tag: row.try_get("version_tag")?,
        source_type: row.try_get("source_type")?,
        source_ref: row.try_get("source_ref")?,
        commit_hash: row.try_get("commit_hash")?,
        artifact_drive_uri: row.try_get("artifact_path")?,
        artifact_size: row.try_get("artifact_size")?,
        artifact_hash: row.try_get("artifact_hash")?,
        config_snapshot,
        status,
        retained: status != 3,
        created_at: instant_from_row(row, "created_at")?,
    })
}

fn normalized_optional(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}
