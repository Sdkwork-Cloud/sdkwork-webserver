use sdkwork_webserver_contract::{
    CertificateIdentifierResponse, CertificateIssueUpdate, CertificateOperationLease,
    CertificatePage, CertificateResponse, WebServiceError, WebServiceResult,
};
use sqlx::Row;

use super::support::{
    bool_from_row, instant_from_row, new_uuid, next_id, optional_instant_from_row, pagination,
    store_error,
};
use super::certificate_secrets::{
    certificate_secret_ref, encrypt_certificate_secret_bundle,
    CERTIFICATE_SECRET_ENCRYPTION_ALGORITHM,
};
use super::{EngineRow, WebRepository};

impl WebRepository {
    pub(super) async fn list_certificates_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        site_uuid: Option<&str>,
        domain_uuid: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<CertificatePage> {
        let (_page, page_size, offset) = pagination(page, page_size);
        let total: i64 = sqlx::query_scalar(
             "SELECT COUNT(*) FROM web_certificate c
              WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
                AND ($2 IS NULL OR c.user_id = $2)
               AND ($3 IS NULL OR EXISTS (
                   SELECT 1 FROM web_certificate_identifier ci
                   INNER JOIN web_site_binding b ON b.tenant_id = ci.tenant_id
                       AND b.domain_id = ci.domain_id AND b.deleted_at IS NULL
                       AND b.status <> 'ARCHIVED'
                   INNER JOIN web_site s ON s.tenant_id = b.tenant_id AND s.id = b.site_id
                   WHERE ci.tenant_id = c.tenant_id AND ci.certificate_id = c.id
                     AND s.uuid = $3 AND s.deleted_at IS NULL
               ))
               AND ($4 IS NULL OR EXISTS (
                   SELECT 1 FROM web_certificate_identifier domain_ci
                   INNER JOIN web_domain domain_d ON domain_d.tenant_id = domain_ci.tenant_id
                       AND domain_d.id = domain_ci.domain_id
                   WHERE domain_ci.tenant_id = c.tenant_id
                     AND domain_ci.certificate_id = c.id
                     AND domain_d.uuid = $4 AND domain_d.deleted_at IS NULL
               ))",
        )
        .bind(tenant_id)
        .bind(owner_id)
        .bind(site_uuid)
        .bind(domain_uuid)
        .fetch_one(&self.pool)
        .await
        .map_err(|error| store_error("count web_certificate", error))?;

        let rows = sqlx::query(&certificate_select(
            "c.tenant_id = $1 AND c.deleted_at IS NULL
             AND ($2 IS NULL OR c.user_id = $2)
             AND ($3 IS NULL OR EXISTS (
                 SELECT 1 FROM web_certificate_identifier site_ci
                 INNER JOIN web_site_binding site_b ON site_b.tenant_id = site_ci.tenant_id
                     AND site_b.domain_id = site_ci.domain_id AND site_b.deleted_at IS NULL
                     AND site_b.status <> 'ARCHIVED'
                 INNER JOIN web_site site_s ON site_s.tenant_id = site_b.tenant_id
                     AND site_s.id = site_b.site_id
                 WHERE site_ci.tenant_id = c.tenant_id
                   AND site_ci.certificate_id = c.id AND site_s.uuid = $3
                   AND site_s.deleted_at IS NULL
             ))
             AND ($4 IS NULL OR EXISTS (
                 SELECT 1 FROM web_certificate_identifier domain_ci
                 INNER JOIN web_domain domain_d ON domain_d.tenant_id = domain_ci.tenant_id
                     AND domain_d.id = domain_ci.domain_id
                 WHERE domain_ci.tenant_id = c.tenant_id
                   AND domain_ci.certificate_id = c.id
                   AND domain_d.uuid = $4 AND domain_d.deleted_at IS NULL
             ))
             ORDER BY c.updated_at DESC, c.id DESC LIMIT $5 OFFSET $6",
        ))
        .bind(tenant_id)
        .bind(owner_id)
        .bind(site_uuid)
        .bind(domain_uuid)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list web_certificate", error))?;
        let items = rows
            .iter()
            .map(map_certificate_row)
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| {
                WebServiceError::Internal(format!("map web_certificate row: {error}"))
            })?;
        Ok(CertificatePage { items, total })
    }

    pub(super) async fn update_certificate_auto_renew_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        auto_renew: bool,
    ) -> WebServiceResult<CertificateResponse> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin certificate renewal policy update", error))?;
        let certificate = sqlx::query(
            "SELECT id, cert_type, status, renewal_status
             FROM web_certificate
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL
             FOR UPDATE",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|error| store_error("resolve certificate renewal policy", error))?
        .ok_or_else(|| WebServiceError::not_found("certificate not found"))?;
        let certificate_id: i64 = certificate
            .try_get("id")
            .map_err(|error| store_error("map certificate renewal policy id", error))?;
        let cert_type: i32 = certificate
            .try_get("cert_type")
            .map_err(|error| store_error("map certificate renewal policy type", error))?;
        let status: i32 = certificate
            .try_get("status")
            .map_err(|error| store_error("map certificate renewal policy status", error))?;
        let renewal_status: i32 = certificate
            .try_get("renewal_status")
            .map_err(|error| store_error("map certificate renewal state", error))?;
        if auto_renew && cert_type != 1 {
            return Err(WebServiceError::validation(
                "automatic renewal is supported only for ACME certificates",
            ));
        }
        if status != 1 || matches!(renewal_status, 1 | 2) {
            return Err(WebServiceError::conflict(
                "certificate is unavailable or renewal is in progress",
            ));
        }
        sqlx::query(
            "UPDATE web_certificate
             SET auto_renew = $3, updated_at = NOW(), version = version + 1
             WHERE tenant_id = $1 AND id = $2",
        )
        .bind(tenant_id)
        .bind(certificate_id)
        .bind(auto_renew)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("update certificate renewal policy", error))?;
        tx.commit()
            .await
            .map_err(|error| store_error("commit certificate renewal policy update", error))?;
        self.retrieve_certificate_repo(tenant_id, certificate_uuid).await
    }

    pub(super) async fn finalize_certificate_operation_repo(
        &self,
        lease: &CertificateOperationLease,
        update: &CertificateIssueUpdate,
    ) -> WebServiceResult<CertificateResponse> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin finalize certificate", error))?;
        let aggregate = sqlx::query(
            "SELECT operation.id AS operation_internal_id, operation.status,
                    operation.lease_owner, operation.fencing_token,
                    operation.lease_expires_at > NOW() AS lease_current,
                    operation.operation_type,
                    certificate.id, certificate.uuid AS certificate_uuid,
                    certificate.current_version_id, certificate.renewal_status,
                    certificate.version
             FROM web_certificate_operation operation
             INNER JOIN web_certificate certificate
               ON certificate.tenant_id = operation.tenant_id
              AND certificate.id = operation.certificate_id
             WHERE operation.tenant_id = $1 AND operation.uuid = $2
               AND certificate.deleted_at IS NULL
             FOR UPDATE OF operation, certificate",
        )
        .bind(lease.tenant_id)
        .bind(&lease.operation_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|error| store_error("lock certificate operation for finalization", error))?
        .ok_or_else(|| WebServiceError::not_found("certificate operation not found"))?;
        super::certificate_operations::validate_operation_lease(&aggregate, lease)?;
        let operation_type: String = aggregate
            .try_get("operation_type")
            .map_err(|error| store_error("map certificate operation type", error))?;
        if operation_type != lease.operation_type {
            return Err(WebServiceError::conflict(
                "certificate operation type changed concurrently",
            ));
        }
        let operation_internal_id: i64 = aggregate
            .try_get("operation_internal_id")
            .map_err(|error| store_error("map certificate operation id", error))?;
        let certificate_id: i64 = aggregate
            .try_get("id")
            .map_err(|error| store_error("map certificate aggregate id", error))?;
        let current_version_id: Option<i64> = aggregate
            .try_get("current_version_id")
            .map_err(|error| store_error("map current certificate version", error))?;
        let version_no: i64 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version_no), 0) + 1 FROM web_certificate_version
             WHERE tenant_id = $1 AND certificate_id = $2",
        )
        .bind(lease.tenant_id)
        .bind(certificate_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|error| store_error("allocate certificate version number", error))?;
        if current_version_id.is_some() {
            sqlx::query(
                "UPDATE web_certificate_version SET status = 'SUPERSEDED'
                 WHERE tenant_id = $1 AND certificate_id = $2 AND id = $3
                   AND status = 'ACTIVE'",
            )
            .bind(lease.tenant_id)
            .bind(certificate_id)
            .bind(current_version_id)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("supersede stale desired certificate version", error))?;
        }
        let version_id = next_id(self.id_generator())?;
        let version_uuid = new_uuid();
        let secret_bundle_ref = certificate_secret_ref(&version_uuid);
        let bundle_encrypted = encrypt_certificate_secret_bundle(
            self.secret_key(),
            lease.tenant_id,
            &version_uuid,
            &update.fullchain_pem,
            &update.private_key_pem,
        )?;
        let version_sql =
            "INSERT INTO web_certificate_version (
                id, uuid, tenant_id, certificate_id, version_no, serial_sha256,
                fingerprint_sha256, spki_sha256, chain_sha256, issuer, subject,
                key_algorithm, not_before, not_after, secret_bundle_ref, status, created_at
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                CAST($13 AS TIMESTAMPTZ), CAST($14 AS TIMESTAMPTZ), $15, 'ACTIVE', NOW()
             )";
        sqlx::query(version_sql)
            .bind(version_id)
            .bind(version_uuid)
            .bind(lease.tenant_id)
            .bind(certificate_id)
            .bind(version_no)
            .bind(&update.serial_sha256)
            .bind(&update.fingerprint_sha256)
            .bind(&update.spki_sha256)
            .bind(&update.chain_sha256)
            .bind(&update.issuer)
            .bind(&update.subject)
            .bind(&update.key_algorithm)
            .bind(&update.not_before)
            .bind(&update.not_after)
            .bind(&secret_bundle_ref)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("insert immutable certificate version", error))?;
        sqlx::query(
            "INSERT INTO web_certificate_secret_bundle (
                id, uuid, tenant_id, certificate_version_id, encryption_algorithm,
                bundle_encrypted, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
        )
        .bind(next_id(self.id_generator())?)
        .bind(new_uuid())
        .bind(lease.tenant_id)
        .bind(version_id)
        .bind(CERTIFICATE_SECRET_ENCRYPTION_ALGORITHM)
        .bind(bundle_encrypted)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("insert encrypted certificate secret bundle", error))?;
        let result = sqlx::query(
            "UPDATE web_certificate
             SET cert_name = $3, cert_type = $4, preferred_key_algorithm = $5,
                  auto_renew = $6, renewal_status = 0, status = 1,
                  current_version_id = $7,
                 metadata = '{}', updated_at = NOW(), version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(lease.tenant_id)
        .bind(&lease.certificate_id)
        .bind(&update.cert_name)
        .bind(update.cert_type)
        .bind(&update.key_algorithm)
        .bind(update.auto_renew)
        .bind(version_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("activate immutable certificate version", error))?;
        if result.rows_affected() == 0 {
            return Err(WebServiceError::conflict(
                "certificate aggregate changed concurrently",
            ));
        }
        sqlx::query(
            "UPDATE web_listener_certificate_binding
             SET desired_version_id = $3, key_algorithm = $4,
                 status = CASE WHEN status = 'PAUSED' THEN 'PAUSED' ELSE 'PENDING' END,
                 updated_at = NOW(), version = version + 1
             WHERE tenant_id = $1 AND certificate_id = $2
               AND status <> 'ARCHIVED' AND deleted_at IS NULL",
        )
        .bind(lease.tenant_id)
        .bind(certificate_id)
        .bind(version_id)
        .bind(&update.key_algorithm)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("stage listener certificate versions", error))?;
        sqlx::query(
            "DELETE FROM web_certificate_node_state
             WHERE tenant_id = $1 AND certificate_id = $2
               AND certificate_version_id = $3",
        )
        .bind(lease.tenant_id)
        .bind(certificate_id)
        .bind(version_id)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("invalidate renewed certificate observations", error))?;
        let operation_result = sqlx::query(
            "UPDATE web_certificate_operation
             SET status = 'SUCCEEDED', next_attempt_at = NOW(), lease_owner = NULL,
                 lease_expires_at = NULL, failure_code = NULL, completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2 AND status = 'RUNNING'
               AND lease_owner = $3 AND fencing_token = $4",
        )
        .bind(operation_internal_id)
        .bind(lease.tenant_id)
        .bind(&lease.lease_owner)
        .bind(lease.fencing_token)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("complete certificate operation", error))?;
        if operation_result.rows_affected() != 1 {
            return Err(WebServiceError::conflict(
                "certificate operation lease is no longer current",
            ));
        }
        tx.commit()
            .await
            .map_err(|error| store_error("commit certificate version", error))?;
        self.retrieve_certificate_repo(lease.tenant_id, &lease.certificate_id)
            .await
    }

    pub(super) async fn retrieve_certificate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
    ) -> WebServiceResult<CertificateResponse> {
        let row = sqlx::query(&certificate_select(
            "c.tenant_id = $1 AND c.uuid = $2 AND c.deleted_at IS NULL",
        ))
        .bind(tenant_id)
        .bind(certificate_uuid)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve certificate aggregate", error))?
        .ok_or_else(|| WebServiceError::not_found("certificate not found"))?;
        map_certificate_row(&row)
            .map_err(|error| WebServiceError::Internal(format!("map certificate: {error}")))
    }

}

fn certificate_select(predicate: &str) -> String {
    format!(
        "SELECT c.uuid, c.cert_name, c.cert_type, v.issuer,
                v.fingerprint_sha256 AS fingerprint,
                COALESCE(v.key_algorithm, c.preferred_key_algorithm) AS key_algorithm,
                CAST(v.not_before AS TEXT) AS not_before,
                CAST(v.not_after AS TEXT) AS not_after,
                c.auto_renew, c.renewal_status, c.status,
                CAST(COALESCE((
                    SELECT jsonb_agg(jsonb_build_object(
                        'domainId', d.uuid,
                        'hostname', ci.hostname,
                        'identifierType', ci.identifier_type,
                        'position', ci.position
                    ) ORDER BY ci.position)
                    FROM web_certificate_identifier ci
                    INNER JOIN web_domain d ON d.tenant_id = ci.tenant_id
                        AND d.id = ci.domain_id
                    WHERE ci.tenant_id = c.tenant_id AND ci.certificate_id = c.id
                ), '[]'::jsonb) AS TEXT) AS identifiers,
                CAST(c.created_at AS TEXT) AS created_at
         FROM web_certificate c
             LEFT JOIN web_certificate_version v
             ON v.id = c.current_version_id
             AND v.certificate_id = c.id
         WHERE {predicate}"
    )
}

fn map_certificate_row(row: &EngineRow) -> Result<CertificateResponse, sqlx::Error> {
    let identifiers_json: String = row.try_get("identifiers")?;
    let identifiers = serde_json::from_str::<Vec<CertificateIdentifierResponse>>(&identifiers_json)
        .map_err(|error| sqlx::Error::Decode(Box::new(error)))?;
    let not_before = optional_instant_from_row(row, "not_before")?;
    let not_after = optional_instant_from_row(row, "not_after")?;
    Ok(CertificateResponse {
        id: row.try_get("uuid")?,
        cert_name: row.try_get("cert_name")?,
        identifiers,
        cert_type: row.try_get("cert_type")?,
        issuer: row.try_get("issuer")?,
        fingerprint: row.try_get("fingerprint")?,
        key_algorithm: row.try_get("key_algorithm")?,
        not_before,
        not_after: not_after.clone(),
        auto_renew: Some(bool_from_row(row, "auto_renew")?),
        renewal_status: Some(certificate_renewal_status(row.try_get("renewal_status")?)),
        status: certificate_asset_status(
            row.try_get("status")?,
            row.try_get("renewal_status")?,
            not_after.as_deref(),
        ),
        created_at: instant_from_row(row, "created_at")?,
    })
}

pub(super) fn certificate_asset_status(
    status: i32,
    renewal_status: i32,
    not_after: Option<&str>,
) -> String {
    if status == 1
        && not_after
            .and_then(|value| sdkwork_utils_rust::datetime::parse_datetime(value, None))
            .is_some_and(|expires_at| {
                !sdkwork_utils_rust::datetime::is_after(
                    expires_at,
                    sdkwork_utils_rust::datetime::now(),
                )
            })
    {
        return "EXPIRED".to_string();
    }
    match (status, renewal_status) {
        (0, 3) => "FAILED",
        (0, _) => "PENDING",
        (1, _) => "ISSUED",
        (2, _) => "EXPIRED",
        (3, _) => "REVOKED",
        (4, _) => "ARCHIVED",
        _ => "FAILED",
    }
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::certificate_asset_status;

    #[test]
    fn issued_certificate_status_is_projected_from_immutable_version_expiry() {
        assert_eq!(
            certificate_asset_status(1, 0, Some("2000-01-01T00:00:00.000Z")),
            "EXPIRED"
        );
        assert_eq!(
            certificate_asset_status(1, 0, Some("2099-01-01T00:00:00.000Z")),
            "ISSUED"
        );
        assert_eq!(
            certificate_asset_status(3, 0, Some("2099-01-01T00:00:00.000Z")),
            "REVOKED"
        );
    }
}

fn certificate_renewal_status(status: i32) -> String {
    match status {
        0 => "IDLE",
        1 => "RENEWING",
        2 => "PENDING",
        3 => "FAILED",
        _ => "FAILED",
    }
    .to_string()
}
