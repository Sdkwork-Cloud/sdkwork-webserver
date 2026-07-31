use futures_util::TryStreamExt;
use sdkwork_webserver_contract::{
    AgentCertificateObservation, AgentSyncResponse, WebServiceError, WebServiceResult,
};
use sqlx::Row;
use std::collections::HashSet;

use super::agents::AuthenticatedAgent;
use super::support::{new_uuid, next_id, store_error};
use super::WebRepository;

const MAX_PENDING_LISTENER_BINDINGS: usize = 256;

impl WebRepository {
    pub(super) async fn record_certificate_observations(
        &self,
        agent: &AuthenticatedAgent,
        observations: &[AgentCertificateObservation],
        manifest: &AgentSyncResponse,
    ) -> WebServiceResult<()> {
        if observations.is_empty() {
            return Ok(());
        }
        let expected = manifest
            .certificates
            .iter()
            .map(|certificate| {
                (
                    certificate.certificate_id.as_str(),
                    certificate.fingerprint.as_str(),
                )
            })
            .collect::<HashSet<_>>();
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin certificate node observation", error))?;
        for observation in observations {
            if observation.sync_version != manifest.sync_version
                || !expected.contains(&(
                    observation.certificate_id.as_str(),
                    observation.fingerprint.as_str(),
                ))
            {
                return Err(WebServiceError::conflict(
                    "certificate observation is not part of the current node manifest",
                ));
            }
            let result = sqlx::query(
                "INSERT INTO web_certificate_node_state (
                    id, uuid, tenant_id, server_id, certificate_id,
                    certificate_version_id, state, fingerprint_sha256, sync_version,
                    failure_code, observed_at, created_at, updated_at, version
                 )
                 SELECT $1, $2, $3, s.id, c.id, v.id, $7,
                        v.fingerprint_sha256, $8, $9, CAST($10 AS TIMESTAMPTZ),
                        NOW(), NOW(), 0
                 FROM web_server s
                 INNER JOIN web_certificate c ON c.tenant_id = s.tenant_id
                     AND c.uuid = $5 AND c.deleted_at IS NULL
                 INNER JOIN web_certificate_version v ON v.tenant_id = c.tenant_id
                     AND v.certificate_id = c.id AND v.fingerprint_sha256 = $6
                 WHERE s.tenant_id = $3 AND s.uuid = $4
                   AND EXISTS (
                       SELECT 1
                       FROM web_listener_certificate_binding l
                       WHERE l.tenant_id = c.tenant_id
                         AND l.certificate_id = c.id AND l.desired_version_id = v.id
                         AND l.status IN ('PENDING', 'DEPLOYING', 'ACTIVE', 'FAILED')
                         AND l.deleted_at IS NULL
                   )
                 ON CONFLICT ON CONSTRAINT uk_web_certificate_node_state_version
                 DO UPDATE SET state = EXCLUDED.state,
                     fingerprint_sha256 = EXCLUDED.fingerprint_sha256,
                     sync_version = EXCLUDED.sync_version,
                     failure_code = EXCLUDED.failure_code,
                     observed_at = EXCLUDED.observed_at,
                     updated_at = EXCLUDED.updated_at,
                     version = web_certificate_node_state.version + 1",
            )
            .bind(next_id(self.id_generator())?)
            .bind(new_uuid())
            .bind(agent.tenant_id)
            .bind(&agent.server_uuid)
            .bind(&observation.certificate_id)
            .bind(&observation.fingerprint)
            .bind(&observation.state)
            .bind(&observation.sync_version)
            .bind(observation.failure_code.as_deref())
            .bind(&observation.observed_at)
            .execute(&mut *transaction)
            .await
            .map_err(|error| store_error("record active certificate node observation", error))?;
            if result.rows_affected() != 1 {
                return Err(WebServiceError::conflict(
                    "observed certificate is no longer the desired version",
                ));
            }
        }
        transaction
            .commit()
            .await
            .map_err(|error| store_error("commit certificate node observations", error))?;
        Ok(())
    }

    pub(super) async fn promote_converged_listener_certificate_bindings(
        &self,
        tenant_id: i64,
    ) -> WebServiceResult<()> {
        let mut transaction = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin certificate convergence", error))?;
        let sql = format!(
            "SELECT l.id AS binding_id, l.certificate_id,
                    l.desired_version_id AS desired_version_id
             FROM web_listener_certificate_binding l
             INNER JOIN web_certificate_version v ON v.tenant_id = l.tenant_id
                 AND v.certificate_id = l.certificate_id
                 AND v.id = l.desired_version_id
                 AND v.status IN ('ACTIVE', 'SUPERSEDED')
             WHERE l.tenant_id = $1
               AND l.status IN ('PENDING', 'DEPLOYING', 'FAILED')
               AND l.deleted_at IS NULL
             ORDER BY l.id ASC
             LIMIT {}
             FOR UPDATE OF l",
            MAX_PENDING_LISTENER_BINDINGS + 1
        );
        let mut candidates = sqlx::query(&sql).bind(tenant_id).fetch(&mut *transaction);
        let mut rows = Vec::new();
        while let Some(row) = candidates
            .try_next()
            .await
            .map_err(|error| store_error("load candidate certificate versions", error))?
        {
            rows.push(row);
        }
        drop(candidates);
        if rows.len() > MAX_PENDING_LISTENER_BINDINGS {
            return Err(WebServiceError::Internal(format!(
                "certificate convergence exceeds {MAX_PENDING_LISTENER_BINDINGS} pending listener bindings"
            )));
        }

        for row in rows {
            let binding_id: i64 = row
                .try_get("binding_id")
                .map_err(|error| store_error("map converging listener binding id", error))?;
            let certificate_id: i64 = row
                .try_get("certificate_id")
                .map_err(|error| store_error("map converging certificate id", error))?;
            let desired_version_id: i64 = row
                .try_get("desired_version_id")
                .map_err(|error| store_error("map desired certificate version id", error))?;
            let counts = sqlx::query(
                "WITH assigned_servers AS (
                    SELECT DISTINCT a.server_id
                    FROM web_listener_certificate_binding l
                    INNER JOIN web_site_binding b ON b.tenant_id = l.tenant_id
                        AND b.id = l.site_binding_id AND b.deleted_at IS NULL
                    INNER JOIN web_site s ON s.tenant_id = b.tenant_id
                        AND s.id = b.site_id AND s.deleted_at IS NULL
                    INNER JOIN web_runtime_assignment a ON a.tenant_id = l.tenant_id
                        AND NOT EXISTS (
                            SELECT 1 FROM web_runtime_assignment newer
                            WHERE newer.tenant_id = a.tenant_id
                              AND newer.server_id = a.server_id
                              AND newer.environment = a.environment
                              AND newer.generation > a.generation
                        )
                        AND a.runtime_set @> jsonb_build_object(
                            'descriptors',
                            jsonb_build_array(jsonb_build_object('siteUuid', s.uuid))
                        )
                    WHERE l.tenant_id = $1 AND l.id = $3
                      AND l.desired_version_id = $2 AND l.deleted_at IS NULL
                 )
                 SELECT COUNT(*) AS assigned_count,
                        COUNT(o.server_id) AS observed_count,
                        COUNT(o.server_id) FILTER (WHERE o.state = 'SERVED') AS served_count,
                        COUNT(o.server_id) FILTER (WHERE o.state = 'FAILED') AS failed_count
                 FROM assigned_servers assigned
                 LEFT JOIN web_certificate_node_state o ON o.tenant_id = $1
                     AND o.server_id = assigned.server_id
                     AND o.certificate_version_id = $2",
            )
            .bind(tenant_id)
            .bind(desired_version_id)
            .bind(binding_id)
            .fetch_one(&mut *transaction)
            .await
            .map_err(|error| store_error("count certificate node convergence", error))?;
            let assigned_count: i64 = counts
                .try_get("assigned_count")
                .map_err(|error| store_error("map assigned certificate node count", error))?;
            let observed_count: i64 = counts
                .try_get("observed_count")
                .map_err(|error| store_error("map observed certificate node count", error))?;
            let served_count: i64 = counts
                .try_get("served_count")
                .map_err(|error| store_error("map served certificate node count", error))?;
            let failed_count: i64 = counts
                .try_get("failed_count")
                .map_err(|error| store_error("map failed certificate node count", error))?;
            if failed_count > 0 {
                sqlx::query(
                    "UPDATE web_listener_certificate_binding
                     SET status = 'FAILED', updated_at = NOW(), version = version + 1
                     WHERE tenant_id = $1 AND id = $2 AND desired_version_id = $3
                       AND status IN ('PENDING', 'DEPLOYING', 'FAILED')
                       AND deleted_at IS NULL",
                )
                .bind(tenant_id)
                .bind(binding_id)
                .bind(desired_version_id)
                .execute(&mut *transaction)
                .await
                .map_err(|error| store_error("fail listener certificate rollout", error))?;
                continue;
            }
            if assigned_count > 0 && served_count == assigned_count {
                sqlx::query(
                    "UPDATE web_listener_certificate_binding
                     SET current_version_id = desired_version_id, status = 'ACTIVE',
                         activated_at = NOW(), updated_at = NOW(), version = version + 1
                     WHERE tenant_id = $1 AND id = $2 AND certificate_id = $3
                       AND desired_version_id = $4
                       AND status IN ('PENDING', 'DEPLOYING', 'FAILED')
                       AND deleted_at IS NULL",
                )
                .bind(tenant_id)
                .bind(binding_id)
                .bind(certificate_id)
                .bind(desired_version_id)
                .execute(&mut *transaction)
                .await
                .map_err(|error| store_error("activate converged listener certificate", error))?;
            } else if observed_count > 0 {
                sqlx::query(
                    "UPDATE web_listener_certificate_binding
                     SET status = 'DEPLOYING', updated_at = NOW(), version = version + 1
                     WHERE tenant_id = $1 AND id = $2 AND desired_version_id = $3
                       AND status IN ('PENDING', 'DEPLOYING', 'FAILED')
                       AND deleted_at IS NULL",
                )
                .bind(tenant_id)
                .bind(binding_id)
                .bind(desired_version_id)
                .execute(&mut *transaction)
                .await
                .map_err(|error| store_error("advance listener certificate rollout", error))?;
            }
        }
        transaction
            .commit()
            .await
            .map_err(|error| store_error("commit certificate convergence", error))?;
        Ok(())
    }
}
