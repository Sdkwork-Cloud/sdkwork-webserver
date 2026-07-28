use super::{EngineRow, WebRepository};
use sdkwork_webserver_contract::{
    CreateDeploymentRequest, DeploymentPage, DeploymentResponse, WebServiceError, WebServiceResult,
};
use sqlx::Row;

use super::support::{
    instant_from_row, instant_write_expression, is_unique_violation, new_uuid, next_id,
    now_rfc3339, optional_instant_from_row, pagination, resolve_site_internal_id, store_error,
};

impl WebRepository {
    pub(super) async fn list_deployments_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        page: i32,
        page_size: i32,
        status: Option<i32>,
    ) -> WebServiceResult<DeploymentPage> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let (page, page_size, offset) = pagination(page, page_size);

        let (count_row, rows) = if let Some(status) = status {
            let count_row = sqlx::query(
                "SELECT COUNT(*) AS total FROM web_deployment
                 WHERE tenant_id = $1 AND site_id = $2 AND status = $3",
            )
            .bind(tenant_id)
            .bind(site_internal_id)
            .bind(status)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| store_error("count web_deployment", error))?;

            let rows = sqlx::query(
                "SELECT uuid, site_id, status, deploy_type, environment, version_tag,
                        commit_hash, source_ref, artifact_path, artifact_size, artifact_hash,
                        CAST(started_at AS TEXT) AS started_at,
                        CAST(completed_at AS TEXT) AS completed_at, duration_ms,
                        CAST(created_at AS TEXT) AS created_at
                 FROM web_deployment
                 WHERE tenant_id = $1 AND site_id = $2 AND status = $3
                 ORDER BY created_at DESC, id DESC LIMIT $4 OFFSET $5",
            )
            .bind(tenant_id)
            .bind(site_internal_id)
            .bind(status)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| store_error("list web_deployment", error))?;

            (count_row, rows)
        } else {
            let count_row = sqlx::query(
                "SELECT COUNT(*) AS total FROM web_deployment
                 WHERE tenant_id = $1 AND site_id = $2",
            )
            .bind(tenant_id)
            .bind(site_internal_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| store_error("count web_deployment", error))?;

            let rows = sqlx::query(
                "SELECT uuid, site_id, status, deploy_type, environment, version_tag,
                        commit_hash, source_ref, artifact_path, artifact_size, artifact_hash,
                        CAST(started_at AS TEXT) AS started_at,
                        CAST(completed_at AS TEXT) AS completed_at, duration_ms,
                        CAST(created_at AS TEXT) AS created_at
                 FROM web_deployment
                 WHERE tenant_id = $1 AND site_id = $2
                 ORDER BY created_at DESC, id DESC LIMIT $3 OFFSET $4",
            )
            .bind(tenant_id)
            .bind(site_internal_id)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&self.pool)
            .await
            .map_err(|error| store_error("list web_deployment", error))?;

            (count_row, rows)
        };

        let total: i64 = count_row.try_get("total").unwrap_or(0);
        let mut items = Vec::with_capacity(rows.len());
        for row in &rows {
            items.push(map_deployment_row(row, site_id).map_err(|error| {
                WebServiceError::Internal(format!("map web_deployment row: {error}"))
            })?);
        }

        Ok(DeploymentPage {
            items,
            total,
            page,
            page_size,
        })
    }

    pub(super) async fn create_deployment_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        actor_id: Option<i64>,
        request: &CreateDeploymentRequest,
    ) -> WebServiceResult<DeploymentResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let environment = request
            .environment
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or("production");
        let version_tag = normalized_optional(request.version_tag.as_deref());
        let commit_hash = normalized_optional(request.commit_hash.as_deref());
        let source_ref = normalized_optional(request.source_ref.as_deref());
        let artifact_drive_uri = normalized_optional(request.artifact_drive_uri.as_deref());
        let artifact_hash = normalized_optional(request.artifact_hash.as_deref());

        // 幂等性：如果客户端提供了非空 idempotency_key，
        // 先查找是否已存在相同 (tenant_id, idempotency_key) 的 deployment。
        // 存在则直接返回已创建的记录，保证网络重试不会产生重复部署。
        let idempotency_key = request
            .idempotency_key
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty());
        if let Some(key) = idempotency_key {
            if let Some(existing) = self
                .find_deployment_by_idempotency_repo(
                    tenant_id,
                    site_internal_id,
                    site_id,
                    request.deploy_type,
                    environment,
                    version_tag,
                    commit_hash,
                    source_ref,
                    artifact_drive_uri,
                    request.artifact_size,
                    artifact_hash,
                    key,
                )
                .await?
            {
                return Ok(existing);
            }
        }

        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$15");
        let insert_sql = format!(
            "INSERT INTO web_deployment (
                id, uuid, tenant_id, user_id, site_id, deploy_type, environment, version_tag,
                commit_hash, source_ref, artifact_path, artifact_size, artifact_hash, status,
                idempotency_key, metadata,
                created_at, updated_at, version
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, '{{}}',
                {now_expression}, {now_expression}, 0
             )"
        );
        let insert_result = sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(actor_id)
            .bind(site_internal_id)
            .bind(request.deploy_type)
            .bind(environment)
            .bind(version_tag)
            .bind(commit_hash)
            .bind(source_ref)
            .bind(artifact_drive_uri)
            .bind(request.artifact_size)
            .bind(artifact_hash)
            .bind(idempotency_key)
            .bind(&now)
            .execute(&self.pool)
            .await;

        if let Err(error) = insert_result {
            if let Some(key) = idempotency_key.filter(|_| is_unique_violation(&error)) {
                if let Some(existing) = self
                    .find_deployment_by_idempotency_repo(
                        tenant_id,
                        site_internal_id,
                        site_id,
                        request.deploy_type,
                        environment,
                        version_tag,
                        commit_hash,
                        source_ref,
                        artifact_drive_uri,
                        request.artifact_size,
                        artifact_hash,
                        key,
                    )
                    .await?
                {
                    return Ok(existing);
                }
            }
            return Err(store_error("insert web_deployment", error));
        }

        self.retrieve_deployment_repo(tenant_id, site_id, &uuid)
            .await
    }

    /// 通过 (tenant_id, site_id, idempotency_key) 查找已存在的 deployment。
    /// 用于 create_deployment 的幂等性检查。
    async fn find_deployment_by_idempotency_repo(
        &self,
        tenant_id: i64,
        requested_site_internal_id: i64,
        requested_site_id: &str,
        requested_deploy_type: i32,
        requested_environment: &str,
        requested_version_tag: Option<&str>,
        requested_commit_hash: Option<&str>,
        requested_source_ref: Option<&str>,
        requested_artifact_drive_uri: Option<&str>,
        requested_artifact_size: Option<i64>,
        requested_artifact_hash: Option<&str>,
        idempotency_key: &str,
    ) -> WebServiceResult<Option<DeploymentResponse>> {
        let row = sqlx::query(
            "SELECT uuid, site_id, status, deploy_type, environment, version_tag,
                    commit_hash, source_ref, artifact_path, artifact_size, artifact_hash,
                    CAST(started_at AS TEXT) AS started_at,
                    CAST(completed_at AS TEXT) AS completed_at, duration_ms,
                    CAST(created_at AS TEXT) AS created_at
             FROM web_deployment
             WHERE tenant_id = $1 AND idempotency_key = $2",
        )
        .bind(tenant_id)
        .bind(idempotency_key)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("find web_deployment by idempotency_key", error))?;

        let Some(row) = row else {
            return Ok(None);
        };
        let existing_site_internal_id: i64 = row
            .try_get("site_id")
            .map_err(|error| store_error("map idempotent deployment site_id", error))?;
        let existing_deploy_type: i32 = row
            .try_get("deploy_type")
            .map_err(|error| store_error("map idempotent deployment deploy_type", error))?;
        let existing_environment: String = row
            .try_get("environment")
            .map_err(|error| store_error("map idempotent deployment environment", error))?;
        let existing_version_tag: Option<String> = row.try_get("version_tag").ok();
        let existing_commit_hash: Option<String> = row.try_get("commit_hash").ok();
        let existing_source_ref: Option<String> = row.try_get("source_ref").ok();
        let existing_artifact_drive_uri: Option<String> = row.try_get("artifact_path").ok();
        let existing_artifact_size: Option<i64> = row.try_get("artifact_size").ok();
        let existing_artifact_hash: Option<String> = row.try_get("artifact_hash").ok();
        if existing_site_internal_id != requested_site_internal_id
            || existing_deploy_type != requested_deploy_type
            || existing_environment != requested_environment
            || existing_version_tag.as_deref() != requested_version_tag
            || existing_commit_hash.as_deref() != requested_commit_hash
            || existing_source_ref.as_deref() != requested_source_ref
            || existing_artifact_drive_uri.as_deref() != requested_artifact_drive_uri
            || existing_artifact_size != requested_artifact_size
            || existing_artifact_hash.as_deref() != requested_artifact_hash
        {
            return Err(WebServiceError::conflict(
                "idempotency key was already used with different deployment input",
            ));
        }

        map_deployment_row(&row, requested_site_id)
            .map(Some)
            .map_err(|error| WebServiceError::Internal(format!("map web_deployment row: {error}")))
    }

    pub(super) async fn retrieve_deployment_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        deployment_id: &str,
    ) -> WebServiceResult<DeploymentResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let row = sqlx::query(
            "SELECT uuid, site_id, status, deploy_type, environment, version_tag,
                    commit_hash, source_ref, artifact_path, artifact_size, artifact_hash,
                    CAST(started_at AS TEXT) AS started_at,
                    CAST(completed_at AS TEXT) AS completed_at, duration_ms,
                    CAST(created_at AS TEXT) AS created_at
             FROM web_deployment
             WHERE tenant_id = $1 AND site_id = $2 AND uuid = $3",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(deployment_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve web_deployment", error))?
        .ok_or_else(|| WebServiceError::not_found("deployment not found"))?;

        map_deployment_row(&row, site_id)
            .map_err(|error| WebServiceError::Internal(error.to_string()))
    }

    pub(super) async fn rollback_deployment_repo(
        &self,
        tenant_id: i64,
        site_id: &str,
        deployment_id: &str,
        actor_id: Option<i64>,
    ) -> WebServiceResult<DeploymentResponse> {
        let site_internal_id = resolve_site_internal_id(&self.pool, tenant_id, site_id).await?;
        let source = sqlx::query(
            "SELECT id, status, deploy_type, environment, version_tag, commit_hash, source_ref,
                    artifact_path, artifact_size, artifact_hash
             FROM web_deployment
             WHERE tenant_id = $1 AND site_id = $2 AND uuid = $3",
        )
        .bind(tenant_id)
        .bind(site_internal_id)
        .bind(deployment_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("rollback web_deployment lookup", error))?
        .ok_or_else(|| WebServiceError::not_found("deployment not found"))?;

        let source_id: i64 = source
            .try_get("id")
            .map_err(|error| store_error("rollback web_deployment source id", error))?;
        let source_status: i32 = source
            .try_get("status")
            .map_err(|error| store_error("rollback web_deployment source status", error))?;
        if source_status != 2 {
            return Err(WebServiceError::conflict(
                "only a successful deployment can be rolled back",
            ));
        }
        let deploy_type: i32 = source
            .try_get("deploy_type")
            .map_err(|error| store_error("rollback web_deployment deploy_type", error))?;
        let environment: String = source
            .try_get("environment")
            .map_err(|error| store_error("rollback web_deployment environment", error))?;
        let version_tag: Option<String> = source.try_get("version_tag").ok();
        let commit_hash: Option<String> = source.try_get("commit_hash").ok();
        let source_ref: Option<String> = source.try_get("source_ref").ok();
        let artifact_drive_uri: Option<String> = source.try_get("artifact_path").ok();
        let artifact_size: Option<i64> = source.try_get("artifact_size").ok();
        let artifact_hash: Option<String> = source.try_get("artifact_hash").ok();
        let now = now_rfc3339();
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let engine = self.database_engine().await?;
        let rollback_update_time = instant_write_expression(engine, "$4");
        let rollback_insert_time = instant_write_expression(engine, "$15");
        let update_sql = format!(
            "UPDATE web_deployment
             SET status = 5, updated_at = {rollback_update_time}, version = version + 1
             WHERE tenant_id = $1 AND site_id = $2 AND uuid = $3 AND status = 2"
        );
        let insert_sql = format!(
            "INSERT INTO web_deployment (
                id, uuid, tenant_id, user_id, site_id, deploy_type, environment, version_tag,
                commit_hash, source_ref, artifact_path, artifact_size, artifact_hash, status,
                rollback_from, metadata,
                created_at, updated_at, version
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, '{{}}',
                {rollback_insert_time}, {rollback_insert_time}, 0
             )"
        );

        // 事务边界：标记源 deployment 为已回滚 + 创建 rollback 记录必须原子完成，
        // 避免标记成功但记录创建失败导致状态不一致。
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin rollback web_deployment transaction", error))?;

        let updated = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(site_internal_id)
            .bind(deployment_id)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("mark web_deployment rolled back", error))?;

        if updated.rows_affected() == 0 {
            return Err(WebServiceError::conflict(
                "deployment state changed; only a successful deployment can be rolled back",
            ));
        }

        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(actor_id)
            .bind(site_internal_id)
            .bind(deploy_type)
            .bind(&environment)
            .bind(&version_tag)
            .bind(&commit_hash)
            .bind(&source_ref)
            .bind(&artifact_drive_uri)
            .bind(artifact_size)
            .bind(&artifact_hash)
            .bind(source_id)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("insert rollback web_deployment", error))?;

        tx.commit()
            .await
            .map_err(|error| store_error("commit rollback web_deployment transaction", error))?;

        self.retrieve_deployment_repo(tenant_id, site_id, &uuid)
            .await
    }
}

fn map_deployment_row(row: &EngineRow, site_id: &str) -> Result<DeploymentResponse, sqlx::Error> {
    Ok(DeploymentResponse {
        id: row.try_get("uuid")?,
        site_id: site_id.to_owned(),
        status: row.try_get("status")?,
        deploy_type: row.try_get("deploy_type")?,
        environment: row.try_get("environment")?,
        version_tag: row.try_get("version_tag").ok(),
        commit_hash: row.try_get("commit_hash").ok(),
        source_ref: row.try_get("source_ref").ok(),
        artifact_drive_uri: row.try_get("artifact_path").ok(),
        artifact_size: row.try_get("artifact_size").ok(),
        artifact_hash: row.try_get("artifact_hash").ok(),
        started_at: optional_instant_from_row(row, "started_at")?,
        completed_at: optional_instant_from_row(row, "completed_at")?,
        duration_ms: row.try_get("duration_ms").ok(),
        created_at: instant_from_row(row, "created_at")?,
    })
}

fn normalized_optional(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}
