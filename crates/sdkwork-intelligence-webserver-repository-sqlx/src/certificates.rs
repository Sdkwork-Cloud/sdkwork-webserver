use chrono::{DateTime, Duration, Utc};
use serde_json::json;
use sdkwork_webserver_contract::{
    CertificateIdentifierResponse, CertificateIssueUpdate, CertificatePage,
    CertificateRenewalCandidate, CertificateResponse, CreateCertificateRequest, WebServiceError,
    WebServiceResult,
};
use sqlx::Row;

use super::support::{
    bool_from_row, instant_from_row, instant_write_expression, new_uuid, next_id, now_rfc3339,
    optional_instant_from_row, pagination, store_error,
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

    pub(super) async fn insert_certificate_pending_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        domain_uuids: &[String],
        cert_type: i32,
        key_algorithm: &str,
        auto_renew: bool,
    ) -> WebServiceResult<(String, Vec<String>)> {
        if domain_uuids.is_empty() || domain_uuids.len() > 8 {
            return Err(WebServiceError::validation(
                "domainIds must contain between 1 and 8 identifiers",
            ));
        }
        let unique_domain_count = domain_uuids.iter().collect::<std::collections::HashSet<_>>().len();
        if unique_domain_count != domain_uuids.len() {
            return Err(WebServiceError::validation("domainIds must be unique"));
        }
        if !matches!(key_algorithm, "ECDSA" | "RSA") {
            return Err(WebServiceError::validation(
                "keyAlgorithm must be ECDSA or RSA",
            ));
        }
        let domains = sqlx::query(
            "SELECT d.id, d.user_id, d.hostname, d.hostname_type, requested.position
             FROM UNNEST($2::text[]) WITH ORDINALITY requested(uuid, position)
             INNER JOIN web_domain d ON d.tenant_id = $1 AND d.uuid = requested.uuid
             WHERE d.deleted_at IS NULL
               AND d.verification_status = 'VERIFIED'
               AND ($3 IS NULL OR d.user_id = $3)
             ORDER BY requested.position ASC",
        )
        .bind(tenant_id)
        .bind(domain_uuids)
        .bind(owner_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("resolve verified certificate domains", error))?;
        if domains.len() != domain_uuids.len() {
            return Err(WebServiceError::validation(
                "one or more verified certificate domains are unavailable",
            ));
        }
        let asset_owner_id: Option<i64> = domains[0]
            .try_get("user_id")
            .map_err(|error| store_error("map certificate domain owner", error))?;
        for domain in &domains[1..] {
            let domain_owner_id: Option<i64> = domain
                .try_get("user_id")
                .map_err(|error| store_error("map certificate domain owner", error))?;
            if domain_owner_id != asset_owner_id {
                return Err(WebServiceError::validation(
                    "certificate domains must share the same asset owner",
                ));
            }
        }
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$10");
        let certificate_sql = format!(
            "INSERT INTO web_certificate (
                id, uuid, tenant_id, user_id, cert_name, cert_type, ca_profile,
                preferred_key_algorithm, auto_renew, renewal_status, status, metadata,
                created_at, updated_at, version
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, '{{}}',
                       {now_expression}, {now_expression}, 0)"
        );
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin pending certificate", error))?;
        sqlx::query(&certificate_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(asset_owner_id)
            .bind(&uuid)
            .bind(cert_type)
            .bind(match cert_type {
                1 => "LETS_ENCRYPT_PRODUCTION",
                2 => "CUSTOM",
                _ => "SELF_SIGNED",
            })
            .bind(key_algorithm)
            .bind(auto_renew)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|error| store_error("insert pending web_certificate", error))?;
        let mut hostnames = Vec::with_capacity(domains.len());
        for (position, domain) in domains.iter().enumerate() {
            let identifier_id = next_id(self.id_generator())?;
            let identifier_uuid = new_uuid();
            let domain_id: i64 = domain
                .try_get("id")
                .map_err(|error| store_error("map certificate domain id", error))?;
            let hostname: String = domain
                .try_get("hostname")
                .map_err(|error| store_error("map certificate hostname", error))?;
            let hostname_type: String = domain
                .try_get("hostname_type")
                .map_err(|error| store_error("map certificate hostname type", error))?;
            let identifier_time = instant_write_expression(engine, "$9");
            let identifier_sql = format!(
                "INSERT INTO web_certificate_identifier (
                    id, uuid, tenant_id, certificate_id, domain_id, identifier_type,
                    hostname, position, created_at
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, {identifier_time})"
            );
            sqlx::query(&identifier_sql)
                .bind(identifier_id)
                .bind(identifier_uuid)
                .bind(tenant_id)
                .bind(id)
                .bind(domain_id)
                .bind(hostname_type)
                .bind(&hostname)
                .bind(position as i32)
                .bind(&now)
                .execute(&mut *tx)
                .await
                .map_err(|error| store_error("insert certificate identifier", error))?;
            hostnames.push(hostname);
        }
        tx.commit()
            .await
            .map_err(|error| store_error("commit pending certificate", error))?;
        Ok((uuid, hostnames))
    }

    pub(super) async fn list_certificates_due_for_renewal_repo(
        &self,
        renew_before_days: u32,
        claim_expired_before: &str,
        limit: i32,
    ) -> WebServiceResult<Vec<CertificateRenewalCandidate>> {
        let limit = limit.clamp(1, 100);
        let rows = sqlx::query(
            "SELECT c.tenant_id, c.uuid, c.cert_type, c.cert_name, c.auto_renew,
                    c.preferred_key_algorithm,
                    CAST(v.not_after AS TEXT) AS not_after, identifier.hostnames
             FROM web_certificate c
             INNER JOIN web_certificate_version v
                 ON v.id = c.current_version_id
                 AND v.certificate_id = c.id
             INNER JOIN LATERAL (
                 SELECT CAST(jsonb_agg(ci.hostname ORDER BY ci.position) AS TEXT) AS hostnames
                 FROM web_certificate_identifier ci
                 WHERE ci.tenant_id = c.tenant_id AND ci.certificate_id = c.id
             ) identifier ON TRUE
             WHERE c.auto_renew = TRUE AND c.status = 1 AND c.deleted_at IS NULL
               AND (c.renewal_status IN (0, 3)
                    OR (c.renewal_status = 1 AND c.updated_at < CAST($1 AS TIMESTAMPTZ)))
               AND c.cert_type IN (1, 3)
             ORDER BY v.not_after ASC, c.id ASC LIMIT $2",
        )
        .bind(claim_expired_before)
        .bind(limit)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list certificate renewal candidates", error))?;
        let mut items = Vec::with_capacity(rows.len());
        for row in rows {
            let not_after: String = row.try_get("not_after").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate expiry: {error}"))
            })?;
            if !certificate_due_for_renewal(&not_after, renew_before_days).ok_or_else(|| {
                WebServiceError::Internal("active certificate has invalid expiry".to_string())
            })? {
                continue;
            }
            items.push(CertificateRenewalCandidate {
                tenant_id: row.try_get("tenant_id").map_err(map_candidate_error)?,
                certificate_id: row.try_get("uuid").map_err(map_candidate_error)?,
                cert_type: row.try_get("cert_type").map_err(map_candidate_error)?,
                cert_name: row.try_get("cert_name").map_err(map_candidate_error)?,
                hostnames: hostnames_from_row(&row)?,
                key_algorithm: row
                    .try_get("preferred_key_algorithm")
                    .map_err(map_candidate_error)?,
                auto_renew: bool_from_row(&row, "auto_renew").map_err(map_candidate_error)?,
                not_after,
            });
        }
        Ok(items)
    }

    pub(super) async fn claim_certificate_renewal_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        claim_expired_before: &str,
    ) -> WebServiceResult<Option<i64>> {
        let row = sqlx::query(
            "UPDATE web_certificate
             SET renewal_status = 1, updated_at = NOW(), version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1 AND deleted_at IS NULL
               AND (renewal_status IN (0, 3)
                    OR (renewal_status = 1 AND updated_at < CAST($3 AS TIMESTAMPTZ)))
             RETURNING version",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .bind(claim_expired_before)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("claim certificate renewal", error))?;
        row.map(|row| row.try_get("version").map_err(|error| store_error("map renewal version", error)))
            .transpose()
    }

    pub(super) async fn fail_certificate_renewal_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        expected_renewal_version: i64,
        reason: &str,
    ) -> WebServiceResult<()> {
        let metadata = json!({ "renewalFailureReason": reason });
        let result = sqlx::query(
            "UPDATE web_certificate
             SET renewal_status = 3, metadata = CAST($4 AS JSONB), updated_at = NOW(),
                 version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1
               AND renewal_status = 1 AND version = $3 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .bind(expected_renewal_version)
        .bind(metadata.to_string())
        .execute(&self.pool)
        .await
        .map_err(|error| store_error("fail certificate renewal", error))?;
        if result.rows_affected() == 0 {
            return Err(WebServiceError::conflict(
                "certificate renewal claim is no longer current",
            ));
        }
        Ok(())
    }

    pub(super) async fn retrieve_certificate_renewal_candidate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
    ) -> WebServiceResult<CertificateRenewalCandidate> {
        let row = sqlx::query(
            "SELECT c.tenant_id, c.uuid, c.cert_type, c.cert_name, c.auto_renew,
                    c.preferred_key_algorithm,
                    CAST(v.not_after AS TEXT) AS not_after, identifier.hostnames
             FROM web_certificate c
             INNER JOIN web_certificate_version v
                 ON v.id = c.current_version_id
                 AND v.certificate_id = c.id
             INNER JOIN LATERAL (
                 SELECT CAST(jsonb_agg(ci.hostname ORDER BY ci.position) AS TEXT) AS hostnames
                 FROM web_certificate_identifier ci
                 WHERE ci.tenant_id = c.tenant_id AND ci.certificate_id = c.id
             ) identifier ON TRUE
             WHERE c.tenant_id = $1 AND c.uuid = $2 AND c.status = 1
               AND c.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve renewal candidate", error))?
        .ok_or_else(|| WebServiceError::not_found("active certificate not found"))?;
        Ok(CertificateRenewalCandidate {
            tenant_id: row.try_get("tenant_id").map_err(map_candidate_error)?,
            certificate_id: row.try_get("uuid").map_err(map_candidate_error)?,
            cert_type: row.try_get("cert_type").map_err(map_candidate_error)?,
            cert_name: row.try_get("cert_name").map_err(map_candidate_error)?,
            hostnames: hostnames_from_row(&row)?,
            key_algorithm: row
                .try_get("preferred_key_algorithm")
                .map_err(map_candidate_error)?,
            auto_renew: bool_from_row(&row, "auto_renew").map_err(map_candidate_error)?,
            not_after: row.try_get("not_after").map_err(map_candidate_error)?,
        })
    }

    pub(super) async fn update_certificate_auto_renew_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        auto_renew: bool,
    ) -> WebServiceResult<CertificateResponse> {
        let result = sqlx::query(
            "UPDATE web_certificate
             SET auto_renew = $3, updated_at = NOW(), version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1
               AND renewal_status <> 1 AND ($3 = FALSE OR cert_type IN (1, 3))
               AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .bind(auto_renew)
        .execute(&self.pool)
        .await
        .map_err(|error| store_error("update certificate renewal policy", error))?;
        if result.rows_affected() == 0 {
            return Err(WebServiceError::conflict(
                "certificate is unavailable or renewal is in progress",
            ));
        }
        self.retrieve_certificate_repo(tenant_id, certificate_uuid).await
    }

    pub(super) async fn finalize_certificate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        update: &CertificateIssueUpdate,
        expected_renewal_version: Option<i64>,
    ) -> WebServiceResult<CertificateResponse> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|error| store_error("begin finalize certificate", error))?;
        let aggregate = sqlx::query(
            "SELECT id, current_version_id, renewal_status, version
             FROM web_certificate
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL FOR UPDATE",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|error| store_error("lock certificate aggregate", error))?
        .ok_or_else(|| WebServiceError::not_found("certificate not found"))?;
        let certificate_id: i64 = aggregate
            .try_get("id")
            .map_err(|error| store_error("map certificate aggregate id", error))?;
        let aggregate_version: i64 = aggregate
            .try_get("version")
            .map_err(|error| store_error("map certificate aggregate version", error))?;
        let renewal_status: i32 = aggregate
            .try_get("renewal_status")
            .map_err(|error| store_error("map certificate renewal status", error))?;
        if expected_renewal_version
            .is_some_and(|expected| aggregate_version != expected || renewal_status != 1)
        {
            return Err(WebServiceError::conflict(
                "certificate renewal claim is no longer current",
            ));
        }
        let current_version_id: Option<i64> = aggregate
            .try_get("current_version_id")
            .map_err(|error| store_error("map current certificate version", error))?;
        let version_no: i64 = sqlx::query_scalar(
            "SELECT COALESCE(MAX(version_no), 0) + 1 FROM web_certificate_version
             WHERE tenant_id = $1 AND certificate_id = $2",
        )
        .bind(tenant_id)
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
            .bind(tenant_id)
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
            tenant_id,
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
            .bind(tenant_id)
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
        .bind(tenant_id)
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
        .bind(tenant_id)
        .bind(certificate_uuid)
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
        .bind(tenant_id)
        .bind(certificate_id)
        .bind(version_id)
        .bind(&update.key_algorithm)
        .execute(&mut *tx)
        .await
        .map_err(|error| store_error("stage listener certificate versions", error))?;
        tx.commit()
            .await
            .map_err(|error| store_error("commit certificate version", error))?;
        self.retrieve_certificate_repo(tenant_id, certificate_uuid).await
    }

    pub(super) async fn fail_certificate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        reason: &str,
    ) -> WebServiceResult<()> {
        let metadata = json!({ "failureReason": reason });
        sqlx::query(
            "UPDATE web_certificate SET renewal_status = 3, status = 0,
                    metadata = CAST($3 AS JSONB), updated_at = NOW(), version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .bind(metadata.to_string())
        .execute(&self.pool)
        .await
        .map_err(|error| store_error("fail certificate aggregate", error))?;
        Ok(())
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

    pub(super) async fn create_certificate_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        request: &CreateCertificateRequest,
    ) -> WebServiceResult<CertificateResponse> {
        let (uuid, _) = self
            .insert_certificate_pending_repo(
                tenant_id,
                owner_id,
                &request.domain_ids,
                request.cert_type,
                &request.key_algorithm,
                request.auto_renew,
            )
            .await?;
        self.retrieve_certificate_repo(tenant_id, &uuid).await
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
    Ok(CertificateResponse {
        id: row.try_get("uuid")?,
        cert_name: row.try_get("cert_name")?,
        identifiers,
        cert_type: row.try_get("cert_type")?,
        issuer: row.try_get("issuer")?,
        fingerprint: row.try_get("fingerprint")?,
        key_algorithm: row.try_get("key_algorithm")?,
        not_before: optional_instant_from_row(row, "not_before")?,
        not_after: optional_instant_from_row(row, "not_after")?,
        auto_renew: Some(bool_from_row(row, "auto_renew")?),
        renewal_status: Some(certificate_renewal_status(row.try_get("renewal_status")?)),
        status: certificate_asset_status(
            row.try_get("status")?,
            row.try_get("renewal_status")?,
        ),
        created_at: instant_from_row(row, "created_at")?,
    })
}

pub(super) fn certificate_asset_status(status: i32, renewal_status: i32) -> String {
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

fn map_candidate_error(error: sqlx::Error) -> WebServiceError {
    WebServiceError::Internal(format!("map certificate renewal candidate: {error}"))
}

fn hostnames_from_row(row: &EngineRow) -> WebServiceResult<Vec<String>> {
    let value: String = row.try_get("hostnames").map_err(map_candidate_error)?;
    let hostnames = serde_json::from_str::<Vec<String>>(&value).map_err(|error| {
        WebServiceError::Internal(format!("map certificate renewal identifiers: {error}"))
    })?;
    if hostnames.is_empty() {
        return Err(WebServiceError::Internal(
            "active certificate has no identifiers".to_string(),
        ));
    }
    Ok(hostnames)
}

fn certificate_due_for_renewal(not_after: &str, renew_before_days: u32) -> Option<bool> {
    let not_after = parse_database_instant(not_after)?;
    let threshold = Utc::now() + Duration::days(i64::from(renew_before_days));
    Some(not_after.with_timezone(&Utc) <= threshold)
}

fn parse_database_instant(value: &str) -> Option<DateTime<chrono::FixedOffset>> {
    DateTime::parse_from_rfc3339(value)
        .or_else(|_| DateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S%.f%#z"))
        .ok()
}

#[cfg(test)]
mod tests {
    use super::parse_database_instant;

    #[test]
    fn database_instant_parser_accepts_postgres_text_projections() {
        assert!(parse_database_instant("2027-01-01T00:00:00Z").is_some());
        assert!(parse_database_instant("2027-01-01 00:00:00+00").is_some());
        assert!(parse_database_instant("not-an-instant").is_none());
    }

}
