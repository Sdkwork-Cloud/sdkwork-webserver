use futures_util::TryStreamExt;
use sdkwork_utils_rust::crypto::sha256_hash;
use sdkwork_webserver_contract::{
    AgentCertificateBundle, AgentHeartbeatRequest, AgentHeartbeatResponse, AgentNginxConfigBundle,
    AgentSyncResponse, CertificateDistributionPage, CertificateDistributionResponse,
    WebServiceError, WebServiceResult,
};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use super::{EnginePool, EngineRow, WebRepository};
use sqlx::Row;

use super::support::{
    instant_write_expression, json_from_row, json_write_expression, new_agent_token, now_rfc3339,
    pagination, sha256_hex, store_error,
};
use super::certificate_secrets::decrypt_certificate_secret_bundle;

const MAX_NODE_SYNC_ITEMS: usize = 2_048;
const MAX_NODE_SYNC_BUNDLE_BYTES: usize = 12 * 1024 * 1024;
const MAX_NODE_NGINX_CONFIG_BYTES: i64 = 1024 * 1024;

struct NodeSyncBudget {
    items: usize,
    serialized_bytes: usize,
    maximum_items: usize,
    maximum_serialized_bytes: usize,
}

impl NodeSyncBudget {
    fn new() -> Self {
        Self {
            items: 0,
            serialized_bytes: 0,
            maximum_items: MAX_NODE_SYNC_ITEMS,
            maximum_serialized_bytes: MAX_NODE_SYNC_BUNDLE_BYTES,
        }
    }

    fn reserve<T: serde::Serialize>(&mut self, item: &T) -> WebServiceResult<()> {
        self.reserve_with_additional_bytes(item, 0)
    }

    fn reserve_with_additional_bytes<T: serde::Serialize>(
        &mut self,
        item: &T,
        additional_bytes: usize,
    ) -> WebServiceResult<()> {
        if self.items >= self.maximum_items {
            return Err(WebServiceError::Internal(format!(
                "node sync manifest exceeds {} items",
                self.maximum_items
            )));
        }
        let item_bytes = serde_json::to_vec(item)
            .map_err(|error| WebServiceError::Internal(format!("encode node sync item: {error}")))?
            .len()
            .checked_add(additional_bytes)
            .ok_or_else(|| WebServiceError::Internal("node sync item byte overflow".to_string()))?;
        let serialized_bytes = self
            .serialized_bytes
            .checked_add(item_bytes)
            .ok_or_else(|| {
                WebServiceError::Internal("node sync byte budget overflow".to_string())
            })?;
        if serialized_bytes > self.maximum_serialized_bytes {
            return Err(WebServiceError::Internal(format!(
                "node sync manifest exceeds {} serialized bundle bytes",
                self.maximum_serialized_bytes
            )));
        }
        self.items += 1;
        self.serialized_bytes = serialized_bytes;
        Ok(())
    }

    #[cfg(test)]
    fn with_limits(maximum_items: usize, maximum_serialized_bytes: usize) -> Self {
        Self {
            items: 0,
            serialized_bytes: 0,
            maximum_items,
            maximum_serialized_bytes,
        }
    }
}

#[derive(Clone, Debug)]
pub(crate) struct AuthenticatedAgent {
    pub server_uuid: String,
    pub tenant_id: i64,
}

pub(crate) fn hash_agent_token(token: &str) -> String {
    sha256_hash(token.as_bytes())
}

pub(crate) fn generate_agent_token() -> String {
    new_agent_token()
}

impl WebRepository {
    pub(super) async fn authenticate_agent_token_repo(
        &self,
        token: &str,
    ) -> WebServiceResult<AuthenticatedAgent> {
        let token_hash = hash_agent_token(token);
        let sql = "SELECT uuid, tenant_id, name, host
                   FROM web_server
                   WHERE metadata ->> 'agentTokenHash' = $1";
        let row = sqlx::query(sql)
            .bind(token_hash)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| store_error("authenticate web_server agent token", error))?;

        let row = row.ok_or(WebServiceError::Forbidden)?;
        map_authenticated_agent(&row)
            .map_err(|error| WebServiceError::Internal(format!("map authenticated agent: {error}")))
    }

    pub(super) async fn record_agent_heartbeat_repo(
        &self,
        agent: &AuthenticatedAgent,
        request: &AgentHeartbeatRequest,
    ) -> WebServiceResult<AgentHeartbeatResponse> {
        let desired_manifest = if !request.certificate_observations.is_empty() {
            Some(self.build_agent_sync_manifest_repo(agent, None).await?)
        } else {
            None
        };
        let now = now_rfc3339();
        let metadata_patch = json!({
            "lastHeartbeatAt": now,
            "agentVersion": request.agent_version,
            "nginxEnabled": request.nginx_enabled,
            "activeConfigs": request.active_configs,
            "lastAppliedSyncVersion": request.last_sync_version,
        });

        let metadata =
            merge_server_metadata(&self.pool, &agent.server_uuid, &metadata_patch).await?;
        let engine = self.database_engine().await?;
        let metadata_expression = json_write_expression(engine, "$2");
        let now_expression = instant_write_expression(engine, "$3");
        let update_sql = format!(
            "UPDATE web_server SET status = 1, metadata = {metadata_expression},
                    updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $4"
        );

        sqlx::query(&update_sql)
            .bind(agent.tenant_id)
            .bind(metadata.to_string())
            .bind(&now)
            .bind(&agent.server_uuid)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("record web_server heartbeat", error))?;

        if !request.certificate_observations.is_empty() {
            let recorded = self
                .record_certificate_observations(
                agent,
                &request.certificate_observations,
                desired_manifest.as_ref().ok_or_else(|| {
                    WebServiceError::Internal(
                        "desired node manifest missing for certificate observations".to_string(),
                    )
                })?,
                )
                .await?;
            if recorded {
                self.promote_converged_listener_certificate_bindings(agent.tenant_id)
                    .await?;
            }
        }

        Ok(AgentHeartbeatResponse {
            server_id: agent.server_uuid.clone(),
            status: 1,
            acknowledged_at: now,
        })
    }

    pub(super) async fn build_agent_sync_manifest_repo(
        &self,
        agent: &AuthenticatedAgent,
        if_sync_version: Option<&str>,
    ) -> WebServiceResult<AgentSyncResponse> {
        let mut budget = NodeSyncBudget::new();
        let assigned_site_uuids = self
            .load_current_assigned_site_uuids(agent)
            .await?
            .ok_or_else(|| WebServiceError::conflict("runtime assignment not found for node"))?;
        let nginx_configs = self
            .load_active_nginx_configs_for_sites(
                agent.tenant_id,
                &assigned_site_uuids,
                &mut budget,
            )
            .await?;
        let certificates = self
            .load_active_certificates_for_sites(
                agent.tenant_id,
                &assigned_site_uuids,
                &mut budget,
            )
            .await?;
        let sync_version = compute_agent_sync_version(&nginx_configs, &certificates);

        if if_sync_version.is_some_and(|value| value == sync_version) {
            return Ok(AgentSyncResponse {
                server_id: agent.server_uuid.clone(),
                sync_version,
                unchanged: true,
                nginx_configs: Vec::new(),
                certificates: Vec::new(),
            });
        }

        Ok(AgentSyncResponse {
            server_id: agent.server_uuid.clone(),
            sync_version,
            unchanged: false,
            nginx_configs,
            certificates,
        })
    }

    pub(super) async fn list_certificate_distribution_repo(
        &self,
        tenant_id: i64,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<CertificateDistributionPage> {
        let (page, page_size, offset) = pagination(page, page_size)?;
        let count_row = sqlx::query("SELECT COUNT(*) AS total FROM web_server WHERE tenant_id = $1")
            .bind(tenant_id)
            .fetch_one(&self.pool)
            .await
            .map_err(|error| store_error("count web_server certificate distribution", error))?;
        let total: i64 = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_server sync count", error))?;
        let rows = sqlx::query(
            "SELECT uuid, name, host, status, CAST(metadata AS TEXT) AS metadata
             FROM web_server
             WHERE tenant_id = $1
             ORDER BY updated_at DESC, id DESC LIMIT $2 OFFSET $3",
        )
        .bind(tenant_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list web_server certificate distribution", error))?;

        let mut items = Vec::with_capacity(page_size as usize);
        for row in rows {
            let server_uuid: String = row.try_get("uuid").map_err(|error| {
                WebServiceError::Internal(format!(
                    "certificate distribution server uuid: {error}"
                ))
            })?;
            let desired_agent = AuthenticatedAgent {
                server_uuid: server_uuid.clone(),
                tenant_id,
            };
            let assigned = self
                .load_current_assigned_site_uuids(&desired_agent)
                .await?
                .is_some();
            let desired_sync_version = if assigned {
                self.build_agent_sync_manifest_repo(&desired_agent, None)
                    .await?
                    .sync_version
            } else {
                String::new()
            };
            let metadata = json_from_row(&row, "metadata")
                .map_err(|error| {
                    WebServiceError::Internal(format!(
                        "certificate distribution server metadata: {error}"
                    ))
                })?
                .unwrap_or_else(|| json!({}));
            let applied_sync_version = metadata
                .get("lastAppliedSyncVersion")
                .and_then(Value::as_str)
                .map(str::to_owned);
            let last_heartbeat_at = metadata
                .get("lastHeartbeatAt")
                .and_then(Value::as_str)
                .map(str::to_owned);
            let server_status: i32 = row.try_get("status").map_err(|error| {
                WebServiceError::Internal(format!("certificate distribution server status: {error}"))
            })?;
            let status = if server_status == 0 {
                "OFFLINE"
            } else if !assigned {
                "UNASSIGNED"
            } else if applied_sync_version.as_deref() == Some(desired_sync_version.as_str()) {
                "SYNCED"
            } else {
                "PENDING"
            };
            items.push(CertificateDistributionResponse {
                server_id: server_uuid,
                server_name: row.try_get("name").map_err(|error| {
                    WebServiceError::Internal(format!("certificate distribution server name: {error}"))
                })?,
                host: row.try_get("host").map_err(|error| {
                    WebServiceError::Internal(format!("certificate distribution server host: {error}"))
                })?,
                desired_sync_version: desired_sync_version.clone(),
                applied_sync_version,
                status: status.to_string(),
                last_heartbeat_at,
            });
        }

        Ok(CertificateDistributionPage {
            items,
            total,
            page,
            page_size,
        })
    }

    async fn load_current_assigned_site_uuids(
        &self,
        agent: &AuthenticatedAgent,
    ) -> WebServiceResult<Option<Vec<String>>> {
        let rows = sqlx::query(
            "SELECT CAST(a.runtime_set AS TEXT) AS runtime_set
             FROM web_runtime_assignment a
             INNER JOIN web_server s ON s.tenant_id = a.tenant_id AND s.id = a.server_id
             WHERE a.tenant_id = $1 AND s.uuid = $2
               AND NOT EXISTS (
                   SELECT 1 FROM web_runtime_assignment newer
                   WHERE newer.tenant_id = a.tenant_id AND newer.server_id = a.server_id
                     AND newer.environment = a.environment AND newer.generation > a.generation
               )
             ORDER BY a.environment ASC
             LIMIT 5",
        )
        .bind(agent.tenant_id)
        .bind(&agent.server_uuid)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("load current node runtime assignments", error))?;
        if rows.is_empty() {
            return Ok(None);
        }
        if rows.len() > 4 {
            return Err(WebServiceError::Internal(
                "node has more than four current runtime assignments".to_string(),
            ));
        }

        let mut site_uuids = BTreeSet::new();
        for row in rows {
            let raw: String = row.try_get("runtime_set").map_err(|error| {
                WebServiceError::Internal(format!("node runtime assignment JSON: {error}"))
            })?;
            let runtime_set: Value = serde_json::from_str(&raw).map_err(|_| {
                WebServiceError::Internal("stored node runtime assignment is invalid".to_string())
            })?;
            if runtime_set.get("nodeUuid").and_then(Value::as_str)
                != Some(agent.server_uuid.as_str())
            {
                return Err(WebServiceError::Internal(
                    "stored node runtime assignment has an invalid node scope".to_string(),
                ));
            }
            let descriptors = runtime_set
                .get("descriptors")
                .and_then(Value::as_array)
                .ok_or_else(|| {
                    WebServiceError::Internal(
                        "stored node runtime assignment has no descriptors".to_string(),
                    )
                })?;
            for descriptor in descriptors {
                let site_uuid = descriptor
                    .get("siteUuid")
                    .and_then(Value::as_str)
                    .filter(|value| {
                        !value.is_empty()
                            && value.len() <= 128
                            && !value.bytes().any(|byte| byte.is_ascii_control())
                    })
                    .ok_or_else(|| {
                        WebServiceError::Internal(
                            "stored node runtime assignment has an invalid Site identity"
                                .to_string(),
                        )
                    })?;
                site_uuids.insert(site_uuid.to_string());
                if site_uuids.len() > MAX_NODE_SYNC_ITEMS {
                    return Err(WebServiceError::Internal(format!(
                        "node runtime assignment exceeds {MAX_NODE_SYNC_ITEMS} Sites"
                    )));
                }
            }
        }
        Ok(Some(site_uuids.into_iter().collect()))
    }

    async fn load_active_nginx_configs_for_sites(
        &self,
        tenant_id: i64,
        site_uuids: &[String],
        budget: &mut NodeSyncBudget,
    ) -> WebServiceResult<Vec<AgentNginxConfigBundle>> {
        let content_size = "CAST(OCTET_LENGTH(nc.config_content) AS BIGINT)";
        let sql = format!(
            "SELECT nc.uuid,
                    CASE WHEN {content_size} <= {MAX_NODE_NGINX_CONFIG_BYTES}
                         THEN nc.config_content ELSE NULL END AS config_content,
                    {content_size} AS config_content_bytes,
                    nc.version,
                    (SELECT d.hostname FROM web_site_binding b
                     INNER JOIN web_domain d ON d.tenant_id = b.tenant_id AND d.id = b.domain_id
                     WHERE b.tenant_id = nc.tenant_id AND b.site_id = s.id
                       AND b.environment = 'production' AND b.status = 'ACTIVE'
                       AND b.deleted_at IS NULL AND d.deleted_at IS NULL
                     ORDER BY b.is_primary DESC, b.created_at ASC
                     LIMIT 1) AS domain
             FROM web_nginx_config nc
             INNER JOIN web_site s ON s.id = nc.site_id
             WHERE nc.tenant_id = $1 AND s.uuid = ANY($2)
               AND nc.is_active = TRUE AND nc.status = 1
               AND s.deleted_at IS NULL
             ORDER BY nc.id ASC
             LIMIT {}",
            MAX_NODE_SYNC_ITEMS + 1
        );
        let mut rows = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(site_uuids)
            .fetch(&self.pool);

        let mut items = Vec::new();
        while let Some(row) = rows
            .try_next()
            .await
            .map_err(|error| store_error("stream active nginx configs for agent sync", error))?
        {
            let content_bytes: i64 = row.try_get("config_content_bytes").map_err(|error| {
                WebServiceError::Internal(format!("agent sync nginx content bytes: {error}"))
            })?;
            if !(0..=MAX_NODE_NGINX_CONFIG_BYTES).contains(&content_bytes) {
                return Err(WebServiceError::Internal(format!(
                    "active nginx configuration exceeds {MAX_NODE_NGINX_CONFIG_BYTES} bytes"
                )));
            }
            let config_content: Option<String> =
                row.try_get("config_content").map_err(|error| {
                    WebServiceError::Internal(format!("agent sync nginx content: {error}"))
                })?;
            let config_content = config_content.ok_or_else(|| {
                WebServiceError::Internal("active nginx configuration is unavailable".to_string())
            })?;
            let domain: Option<String> = row.try_get("domain").map_err(|error| {
                WebServiceError::Internal(format!("agent sync nginx domain: {error}"))
            })?;
            let domain = domain.filter(|value| !value.is_empty()).ok_or_else(|| {
                WebServiceError::Internal(
                    "active nginx configuration has no deployable domain".to_string(),
                )
            })?;
            let item = AgentNginxConfigBundle {
                config_id: row.try_get("uuid").map_err(|error| {
                    WebServiceError::Internal(format!("agent sync nginx uuid: {error}"))
                })?,
                domain,
                fingerprint: sha256_hex(&config_content),
                config_content,
                version: row.try_get("version").map_err(|error| {
                    WebServiceError::Internal(format!("agent sync nginx version: {error}"))
                })?,
            };
            budget.reserve(&item)?;
            items.push(item);
        }
        Ok(items)
    }

    async fn load_active_certificates_for_sites(
        &self,
        tenant_id: i64,
        site_uuids: &[String],
        budget: &mut NodeSyncBudget,
    ) -> WebServiceResult<Vec<AgentCertificateBundle>> {
        let sql = format!(
            "SELECT DISTINCT c.uuid, c.cert_name, v.fingerprint_sha256 AS fingerprint,
                    v.uuid AS certificate_version_uuid, v.secret_bundle_ref,
                    sb.encryption_algorithm, sb.bundle_encrypted,
                    CAST((
                        SELECT jsonb_agg(hostname ORDER BY hostname)
                        FROM (
                            SELECT DISTINCT listener_domain.hostname
                            FROM web_listener_certificate_binding listener
                            INNER JOIN web_site_binding listener_route
                                ON listener_route.tenant_id = listener.tenant_id
                                AND listener_route.id = listener.site_binding_id
                                AND listener_route.status = 'ACTIVE'
                                AND listener_route.deleted_at IS NULL
                            INNER JOIN web_site listener_site
                                ON listener_site.tenant_id = listener_route.tenant_id
                                AND listener_site.id = listener_route.site_id
                                AND listener_site.deleted_at IS NULL
                            INNER JOIN web_domain listener_domain
                                ON listener_domain.tenant_id = listener_route.tenant_id
                                AND listener_domain.id = listener_route.domain_id
                                AND listener_domain.deleted_at IS NULL
                            WHERE listener.tenant_id = l.tenant_id
                              AND listener.certificate_id = c.id
                              AND listener.desired_version_id = v.id
                              AND listener.status IN ('PENDING', 'DEPLOYING', 'ACTIVE', 'FAILED')
                              AND listener.deleted_at IS NULL
                              AND listener_site.uuid = ANY($2)
                        ) verification_hostnames
                    ) AS TEXT) AS verification_hostnames
             FROM web_listener_certificate_binding l
             INNER JOIN web_site_binding b ON b.tenant_id = l.tenant_id
                 AND b.id = l.site_binding_id AND b.status = 'ACTIVE'
                 AND b.deleted_at IS NULL
             INNER JOIN web_site s ON s.tenant_id = b.tenant_id AND s.id = b.site_id
                 AND s.deleted_at IS NULL
             INNER JOIN web_certificate c ON c.tenant_id = l.tenant_id
                 AND c.id = l.certificate_id AND c.status = 1 AND c.deleted_at IS NULL
             INNER JOIN web_certificate_version v ON v.tenant_id = l.tenant_id
                 AND v.id = l.desired_version_id AND v.certificate_id = c.id
                  AND v.status IN ('ACTIVE', 'SUPERSEDED')
             INNER JOIN web_certificate_secret_bundle sb ON sb.tenant_id = v.tenant_id
                 AND sb.certificate_version_id = v.id
             WHERE l.tenant_id = $1 AND s.uuid = ANY($2)
               AND l.status IN ('PENDING', 'DEPLOYING', 'ACTIVE', 'FAILED')
               AND l.deleted_at IS NULL
             ORDER BY c.uuid ASC
             LIMIT {}",
            MAX_NODE_SYNC_ITEMS + 1
        );
        let mut rows = sqlx::query(&sql)
            .bind(tenant_id)
            .bind(site_uuids)
            .fetch(&self.pool);

        let mut items = Vec::new();
        while let Some(row) = rows
            .try_next()
            .await
            .map_err(|error| store_error("stream active certificates for agent sync", error))?
        {
            let secret_bundle_ref: String = row.try_get("secret_bundle_ref").map_err(|error| {
                WebServiceError::Internal(format!("agent sync certificate secret ref: {error}"))
            })?;
            let certificate_version_uuid: String = row
                .try_get("certificate_version_uuid")
                .map_err(|error| {
                    WebServiceError::Internal(format!(
                        "agent sync certificate version uuid: {error}"
                    ))
                })?;
            let encryption_algorithm: String = row
                .try_get("encryption_algorithm")
                .map_err(|error| {
                    WebServiceError::Internal(format!(
                        "agent sync certificate encryption algorithm: {error}"
                    ))
                })?;
            let bundle_encrypted: String = row.try_get("bundle_encrypted").map_err(|error| {
                WebServiceError::Internal(format!(
                    "agent sync encrypted certificate bundle: {error}"
                ))
            })?;
            let secret_bundle = decrypt_certificate_secret_bundle(
                self.secret_key(),
                tenant_id,
                &certificate_version_uuid,
                &secret_bundle_ref,
                &encryption_algorithm,
                &bundle_encrypted,
            )?;
            let verification_hostnames_json: String = row
                .try_get("verification_hostnames")
                .map_err(|error| {
                    WebServiceError::Internal(format!(
                        "agent sync certificate verification hostnames: {error}"
                    ))
                })?;
            let hostnames = serde_json::from_str::<Vec<String>>(&verification_hostnames_json)
                .map_err(|error| {
                    WebServiceError::Internal(format!(
                        "decode agent sync certificate verification hostnames: {error}"
                    ))
                })?;
            if hostnames.is_empty() || hostnames.len() > 128 {
                return Err(WebServiceError::Internal(
                    "agent sync certificate must target between 1 and 128 listener hostnames"
                        .to_string(),
                ));
            }

            let item = AgentCertificateBundle {
                certificate_id: row.try_get("uuid").map_err(|error| {
                    WebServiceError::Internal(format!("agent sync certificate uuid: {error}"))
                })?,
                cert_name: row.try_get("cert_name").map_err(|error| {
                    WebServiceError::Internal(format!("agent sync certificate name: {error}"))
                })?,
                fingerprint: row.try_get("fingerprint").map_err(|error| {
                    WebServiceError::Internal(format!(
                        "agent sync certificate fingerprint: {error}"
                    ))
                })?,
                hostnames,
                fullchain_pem: secret_bundle.fullchain_pem,
                privkey_pem: secret_bundle.private_key_pem,
            };
            budget.reserve(&item)?;
            items.push(item);
        }
        Ok(items)
    }
}

async fn merge_server_metadata(
    pool: &EnginePool,
    server_uuid: &str,
    patch: &Value,
) -> Result<Value, WebServiceError> {
    let row =
        sqlx::query("SELECT CAST(metadata AS TEXT) AS metadata FROM web_server WHERE uuid = $1")
            .bind(server_uuid)
            .fetch_optional(pool)
            .await
            .map_err(|error| store_error("load web_server metadata", error))?
            .ok_or_else(|| WebServiceError::not_found("server not found"))?;

    let mut existing = json_from_row(&row, "metadata")
        .map_err(|error| WebServiceError::Internal(format!("read server metadata: {error}")))?
        .unwrap_or_else(|| json!({}));
    if let Some(object) = existing.as_object_mut() {
        if let Some(patch_object) = patch.as_object() {
            for (key, value) in patch_object {
                object.insert(key.clone(), value.clone());
            }
        }
    }
    Ok(existing)
}

fn map_authenticated_agent(row: &EngineRow) -> Result<AuthenticatedAgent, sqlx::Error> {
    Ok(AuthenticatedAgent {
        server_uuid: row.try_get("uuid")?,
        tenant_id: row.try_get("tenant_id")?,
    })
}

pub(crate) fn parse_last_heartbeat_at(metadata_raw: &str) -> Option<String> {
    let metadata: Value = serde_json::from_str(metadata_raw).ok()?;
    metadata
        .get("lastHeartbeatAt")
        .and_then(Value::as_str)
        .map(str::to_owned)
}

pub(crate) fn compute_agent_sync_version(
    nginx_configs: &[AgentNginxConfigBundle],
    certificates: &[AgentCertificateBundle],
) -> String {
    let mut parts = Vec::with_capacity(nginx_configs.len() + certificates.len());
    for config in nginx_configs {
        parts.push(format!(
            "n:{}:{}:{}",
            config.config_id, config.fingerprint, config.version
        ));
    }
    for certificate in certificates {
        parts.push(format!(
            "c:{}:{}:{}",
            certificate.certificate_id,
            certificate.fingerprint,
            certificate.hostnames.join(",")
        ));
    }
    parts.sort_unstable();
    format!("sv1:{}", sha256_hash(parts.join("\n").as_bytes()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sync_version_is_stable_for_same_manifest() {
        let nginx = vec![AgentNginxConfigBundle {
            config_id: "cfg-1".to_string(),
            domain: "example.com".to_string(),
            config_content: "server {}".to_string(),
            fingerprint: sha256_hex("server {}"),
            version: 2,
        }];
        let certs = vec![AgentCertificateBundle {
            certificate_id: "cert-1".to_string(),
            cert_name: "example.com".to_string(),
            fingerprint: "abc123".to_string(),
            hostnames: vec!["example.com".to_string()],
            fullchain_pem: String::new(),
            privkey_pem: String::new(),
        }];

        let first = compute_agent_sync_version(&nginx, &certs);
        let second = compute_agent_sync_version(&nginx, &certs);
        assert_eq!(first, second);
        assert!(first.starts_with("sv1:"));
    }

    #[test]
    fn sync_version_changes_when_certificate_fingerprint_changes() {
        let nginx = Vec::new();
        let certs_a = vec![AgentCertificateBundle {
            certificate_id: "cert-1".to_string(),
            cert_name: "example.com".to_string(),
            fingerprint: "abc123".to_string(),
            hostnames: vec!["example.com".to_string()],
            fullchain_pem: String::new(),
            privkey_pem: String::new(),
        }];
        let mut certs_b = certs_a.clone();
        certs_b[0].fingerprint = "def456".to_string();

        assert_ne!(
            compute_agent_sync_version(&nginx, &certs_a),
            compute_agent_sync_version(&nginx, &certs_b)
        );
    }

    #[test]
    fn sync_budget_rejects_item_and_serialized_byte_overflow() {
        let mut item_budget = NodeSyncBudget::with_limits(1, 1024);
        item_budget.reserve(&serde_json::json!({"id": 1})).unwrap();
        assert!(item_budget.reserve(&serde_json::json!({"id": 2})).is_err());

        let mut byte_budget = NodeSyncBudget::with_limits(2, 8);
        assert!(byte_budget
            .reserve(&serde_json::json!({"content": "too-large"}))
            .is_err());
    }
}
