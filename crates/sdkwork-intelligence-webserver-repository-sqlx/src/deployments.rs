use super::{EngineRow, WebRepository};
use sdkwork_webserver_contract::{
    CreateDeploymentRequest, DeploymentPage, DeploymentResponse, WebServiceError, WebServiceResult,
};
use sqlx::Row;

use super::support::{
    instant_from_row, instant_write_expression, is_unique_violation, new_uuid, next_id,
    now_rfc3339, optional_instant_from_row, pagination, resolve_site_internal_id, sha256_hex,
    store_error,
};

struct DeploymentIdempotencyLookup<'a> {
    tenant_id: i64,
    site_internal_id: i64,
    site_id: &'a str,
    deploy_type: i32,
    environment: &'a str,
    version_tag: Option<&'a str>,
    commit_hash: Option<&'a str>,
    source_ref: Option<&'a str>,
    artifact_drive_uri: Option<&'a str>,
    artifact_size: Option<i64>,
    artifact_hash: Option<&'a str>,
    rollback_from_internal_id: Option<i64>,
    idempotency_key: &'a str,
}

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
                "SELECT deployment.uuid, deployment.site_id, deployment.status,
                        deployment.deploy_type, deployment.environment, deployment.version_tag,
                        deployment.commit_hash, deployment.source_ref, deployment.artifact_path,
                        deployment.artifact_size, deployment.artifact_hash,
                        source.uuid AS rollback_from_deployment_id,
                        CAST(deployment.started_at AS TEXT) AS started_at,
                        CAST(deployment.completed_at AS TEXT) AS completed_at,
                        deployment.duration_ms,
                        CAST(deployment.created_at AS TEXT) AS created_at
                 FROM web_deployment deployment
                 LEFT JOIN web_deployment source
                   ON source.id = deployment.rollback_from
                  AND source.tenant_id = deployment.tenant_id
                  AND source.site_id = deployment.site_id
                 WHERE deployment.tenant_id = $1
                   AND deployment.site_id = $2
                   AND deployment.status = $3
                 ORDER BY deployment.created_at DESC, deployment.id DESC LIMIT $4 OFFSET $5",
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
                "SELECT deployment.uuid, deployment.site_id, deployment.status,
                        deployment.deploy_type, deployment.environment, deployment.version_tag,
                        deployment.commit_hash, deployment.source_ref, deployment.artifact_path,
                        deployment.artifact_size, deployment.artifact_hash,
                        source.uuid AS rollback_from_deployment_id,
                        CAST(deployment.started_at AS TEXT) AS started_at,
                        CAST(deployment.completed_at AS TEXT) AS completed_at,
                        deployment.duration_ms,
                        CAST(deployment.created_at AS TEXT) AS created_at
                 FROM web_deployment deployment
                 LEFT JOIN web_deployment source
                   ON source.id = deployment.rollback_from
                  AND source.tenant_id = deployment.tenant_id
                  AND source.site_id = deployment.site_id
                 WHERE deployment.tenant_id = $1 AND deployment.site_id = $2
                 ORDER BY deployment.created_at DESC, deployment.id DESC LIMIT $3 OFFSET $4",
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

        let total: i64 = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_deployment count", error))?;
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
        let idempotency_key_hash = request
            .idempotency_key
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(sha256_hex);
        let idempotency_key = idempotency_key_hash.as_deref();
        let idempotency_lookup = idempotency_key.map(|key| DeploymentIdempotencyLookup {
            tenant_id,
            site_internal_id,
            site_id,
            deploy_type: request.deploy_type,
            environment,
            version_tag,
            commit_hash,
            source_ref,
            artifact_drive_uri,
            artifact_size: request.artifact_size,
            artifact_hash,
            rollback_from_internal_id: None,
            idempotency_key: key,
        });
        if let Some(lookup) = idempotency_lookup.as_ref() {
            if let Some(existing) = self.find_deployment_by_idempotency_repo(lookup).await? {
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
                id, uuid, tenant_id, organization_id, user_id, site_id, deploy_type, environment, version_tag,
                commit_hash, source_ref, artifact_path, artifact_size, artifact_hash, status,
                idempotency_key, metadata,
                created_at, updated_at, version
             ) VALUES (
                $1, $2, $3,
                COALESCE((SELECT organization_id FROM web_site WHERE tenant_id = $3 AND id = $5), 0),
                $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, '{{}}',
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
            if is_unique_violation(&error) {
                let Some(lookup) = idempotency_lookup.as_ref() else {
                    return Err(store_error("insert web_deployment", error));
                };
                if let Some(existing) = self.find_deployment_by_idempotency_repo(lookup).await? {
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
        lookup: &DeploymentIdempotencyLookup<'_>,
    ) -> WebServiceResult<Option<DeploymentResponse>> {
        let row = sqlx::query(
            "SELECT deployment.uuid, deployment.site_id, deployment.status,
                    deployment.deploy_type, deployment.environment, deployment.version_tag,
                    deployment.commit_hash, deployment.source_ref, deployment.artifact_path,
                    deployment.artifact_size, deployment.artifact_hash,
                    deployment.rollback_from,
                    source.uuid AS rollback_from_deployment_id,
                    CAST(deployment.started_at AS TEXT) AS started_at,
                    CAST(deployment.completed_at AS TEXT) AS completed_at,
                    deployment.duration_ms,
                    CAST(deployment.created_at AS TEXT) AS created_at
             FROM web_deployment deployment
             LEFT JOIN web_deployment source
               ON source.id = deployment.rollback_from
              AND source.tenant_id = deployment.tenant_id
              AND source.site_id = deployment.site_id
             WHERE deployment.tenant_id = $1 AND deployment.idempotency_key = $2",
        )
        .bind(lookup.tenant_id)
        .bind(lookup.idempotency_key)
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
        let existing_version_tag: Option<String> = row
            .try_get("version_tag")
            .map_err(|error| store_error("map idempotent deployment version_tag", error))?;
        let existing_commit_hash: Option<String> = row
            .try_get("commit_hash")
            .map_err(|error| store_error("map idempotent deployment commit_hash", error))?;
        let existing_source_ref: Option<String> = row
            .try_get("source_ref")
            .map_err(|error| store_error("map idempotent deployment source_ref", error))?;
        let existing_artifact_drive_uri: Option<String> = row
            .try_get("artifact_path")
            .map_err(|error| store_error("map idempotent deployment artifact_path", error))?;
        let existing_artifact_size: Option<i64> = row
            .try_get("artifact_size")
            .map_err(|error| store_error("map idempotent deployment artifact_size", error))?;
        let existing_artifact_hash: Option<String> = row
            .try_get("artifact_hash")
            .map_err(|error| store_error("map idempotent deployment artifact_hash", error))?;
        let existing_rollback_from_internal_id: Option<i64> = row
            .try_get("rollback_from")
            .map_err(|error| store_error("map idempotent deployment rollback_from", error))?;
        if existing_site_internal_id != lookup.site_internal_id
            || existing_deploy_type != lookup.deploy_type
            || existing_environment != lookup.environment
            || existing_version_tag.as_deref() != lookup.version_tag
            || existing_commit_hash.as_deref() != lookup.commit_hash
            || existing_source_ref.as_deref() != lookup.source_ref
            || existing_artifact_drive_uri.as_deref() != lookup.artifact_drive_uri
            || existing_artifact_size != lookup.artifact_size
            || existing_artifact_hash.as_deref() != lookup.artifact_hash
            || existing_rollback_from_internal_id != lookup.rollback_from_internal_id
        {
            return Err(WebServiceError::conflict(
                "idempotency key was already used with different deployment input",
            ));
        }

        map_deployment_row(&row, lookup.site_id)
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
            "SELECT deployment.uuid, deployment.site_id, deployment.status,
                    deployment.deploy_type, deployment.environment, deployment.version_tag,
                    deployment.commit_hash, deployment.source_ref, deployment.artifact_path,
                    deployment.artifact_size, deployment.artifact_hash,
                    source.uuid AS rollback_from_deployment_id,
                    CAST(deployment.started_at AS TEXT) AS started_at,
                    CAST(deployment.completed_at AS TEXT) AS completed_at,
                    deployment.duration_ms,
                    CAST(deployment.created_at AS TEXT) AS created_at
             FROM web_deployment deployment
             LEFT JOIN web_deployment source
               ON source.id = deployment.rollback_from
              AND source.tenant_id = deployment.tenant_id
              AND source.site_id = deployment.site_id
             WHERE deployment.tenant_id = $1
               AND deployment.site_id = $2
               AND deployment.uuid = $3",
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
        idempotency_key: Option<&str>,
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
        let version_tag: Option<String> = source
            .try_get("version_tag")
            .map_err(|error| store_error("rollback web_deployment version_tag", error))?;
        let commit_hash: Option<String> = source
            .try_get("commit_hash")
            .map_err(|error| store_error("rollback web_deployment commit_hash", error))?;
        let source_ref: Option<String> = source
            .try_get("source_ref")
            .map_err(|error| store_error("rollback web_deployment source_ref", error))?;
        let artifact_drive_uri: Option<String> = source
            .try_get("artifact_path")
            .map_err(|error| store_error("rollback web_deployment artifact_path", error))?;
        let artifact_size: Option<i64> = source
            .try_get("artifact_size")
            .map_err(|error| store_error("rollback web_deployment artifact_size", error))?;
        let artifact_hash: Option<String> = source
            .try_get("artifact_hash")
            .map_err(|error| store_error("rollback web_deployment artifact_hash", error))?;
        let idempotency_key_hash = idempotency_key
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .map(sha256_hex);
        let idempotency_key = idempotency_key_hash.as_deref();
        let idempotency_lookup = idempotency_key.map(|key| DeploymentIdempotencyLookup {
            tenant_id,
            site_internal_id,
            site_id,
            deploy_type,
            environment: &environment,
            version_tag: version_tag.as_deref(),
            commit_hash: commit_hash.as_deref(),
            source_ref: source_ref.as_deref(),
            artifact_drive_uri: artifact_drive_uri.as_deref(),
            artifact_size,
            artifact_hash: artifact_hash.as_deref(),
            rollback_from_internal_id: Some(source_id),
            idempotency_key: key,
        });
        if let Some(lookup) = idempotency_lookup.as_ref() {
            if let Some(existing) = self.find_deployment_by_idempotency_repo(lookup).await? {
                return Ok(existing);
            }
        }

        let now = now_rfc3339();
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let engine = self.database_engine().await?;
        let rollback_insert_time = instant_write_expression(engine, "$16");
        let insert_sql = format!(
            "INSERT INTO web_deployment (
                id, uuid, tenant_id, organization_id, user_id, site_id, deploy_type, environment, version_tag,
                commit_hash, source_ref, artifact_path, artifact_size, artifact_hash, status,
                rollback_from, idempotency_key, metadata,
                created_at, updated_at, version
             ) VALUES (
                $1, $2, $3,
                COALESCE((SELECT organization_id FROM web_site WHERE tenant_id = $3 AND id = $5), 0),
                $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 0, $14, $15, '{{}}',
                {rollback_insert_time}, {rollback_insert_time}, 0
             )"
        );

        // Keep the immutable source untouched; this transaction only creates a restore command.
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin rollback web_deployment transaction", error))?;

        let insert_result = sqlx::query(&insert_sql)
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
            .bind(idempotency_key)
            .bind(&now)
            .execute(&mut *tx)
            .await;

        if let Err(error) = insert_result {
            tx.rollback().await.map_err(|rollback_error| {
                store_error("abort restore web_deployment transaction", rollback_error)
            })?;
            if is_unique_violation(&error) {
                let Some(lookup) = idempotency_lookup.as_ref() else {
                    return Err(store_error("insert restore web_deployment", error));
                };
                if let Some(existing) = self.find_deployment_by_idempotency_repo(lookup).await? {
                    return Ok(existing);
                }
            }
            return Err(store_error("insert restore web_deployment", error));
        }

        tx.commit()
            .await
            .map_err(|error| store_error("commit restore web_deployment transaction", error))?;

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
        version_tag: row.try_get("version_tag")?,
        commit_hash: row.try_get("commit_hash")?,
        source_ref: row.try_get("source_ref")?,
        rollback_from_deployment_id: row.try_get("rollback_from_deployment_id")?,
        artifact_drive_uri: row.try_get("artifact_path")?,
        artifact_size: row.try_get("artifact_size")?,
        artifact_hash: row.try_get("artifact_hash")?,
        started_at: optional_instant_from_row(row, "started_at")?,
        completed_at: optional_instant_from_row(row, "completed_at")?,
        duration_ms: row.try_get("duration_ms")?,
        created_at: instant_from_row(row, "created_at")?,
    })
}

fn normalized_optional(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}
