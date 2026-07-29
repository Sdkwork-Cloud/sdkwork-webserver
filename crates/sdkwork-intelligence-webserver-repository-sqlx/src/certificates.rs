use chrono::{DateTime, Duration, Utc};
use sdkwork_webserver_contract::{
    CertificateIssueUpdate, CertificatePage, CertificateRenewalCandidate, CertificateResponse,
    CreateCertificateRequest, WebServiceError, WebServiceResult,
};
use serde_json::json;
use super::{EngineRow, WebRepository};
use sqlx::Row;

use super::domains_lookup::{cert_name_from_hostname, resolve_domain_by_uuid};
use super::support::{
    bool_from_row, instant_from_row, instant_write_expression, json_from_row,
    json_write_expression, new_uuid, next_id, now_rfc3339, optional_instant_from_row, pagination,
    store_error,
};

impl WebRepository {
    pub(super) async fn list_certificates_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        site_id: Option<&str>,
        page: i32,
        page_size: i32,
    ) -> WebServiceResult<CertificatePage> {
        let (_page, page_size, offset) = pagination(page, page_size);

        let count_row =
            sqlx::query(
                "SELECT COUNT(*) AS total
                 FROM web_certificate c
                 INNER JOIN web_site s ON s.id = c.site_id
                 WHERE c.tenant_id = $1 AND s.deleted_at IS NULL
                   AND ($2 IS NULL OR (s.data_scope = 3 AND s.user_id = $2))
                   AND ($3 IS NULL OR s.uuid = $3)",
            )
            .bind(tenant_id)
            .bind(owner_id)
            .bind(site_id)
                .fetch_one(&self.pool)
                .await
                .map_err(|error| store_error("count web_certificate", error))?;
        let total: i64 = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_certificate count", error))?;

        let rows = sqlx::query(
            "SELECT c.uuid, c.cert_name, d.hostname AS domain, c.cert_type, c.issuer,
                    c.fingerprint, CAST(c.not_before AS TEXT) AS not_before,
                    CAST(c.not_after AS TEXT) AS not_after,
                    c.auto_renew, c.renewal_status, c.status,
                    CAST(c.created_at AS TEXT) AS created_at
             FROM web_certificate c
             LEFT JOIN web_domain d ON d.id = c.domain_id
             INNER JOIN web_site s ON s.id = c.site_id
             WHERE c.tenant_id = $1 AND s.deleted_at IS NULL
               AND ($2 IS NULL OR (s.data_scope = 3 AND s.user_id = $2))
               AND ($3 IS NULL OR s.uuid = $3)
             ORDER BY c.created_at DESC, c.id DESC LIMIT $4 OFFSET $5",
        )
        .bind(tenant_id)
        .bind(owner_id)
        .bind(site_id)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list web_certificate", error))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in &rows {
            items.push(map_certificate_row(row).map_err(|error| {
                WebServiceError::Internal(format!("map web_certificate row: {error}"))
            })?);
        }

        Ok(CertificatePage { items, total })
    }

    pub(super) async fn insert_certificate_pending_repo(
        &self,
        tenant_id: i64,
        owner_id: Option<i64>,
        domain_uuid: &str,
        cert_type: i32,
        auto_renew: bool,
    ) -> WebServiceResult<(String, String)> {
        let domain = resolve_domain_by_uuid(&self.pool, tenant_id, owner_id, domain_uuid).await?;
        if cert_type == 1 && !domain.is_verified {
            return Err(WebServiceError::validation(
                "domain must be verified before Let's Encrypt issuance",
            ));
        }

        let cert_name = cert_name_from_hostname(&domain.hostname);
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$9");
        let insert_sql = format!(
            "INSERT INTO web_certificate (
                id, uuid, tenant_id, site_id, domain_id, cert_name, cert_type,
                auto_renew, renewal_status, status, metadata, created_at, updated_at, version
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, 2, 0, '{{}}',
                {now_expression}, {now_expression}, 0
             )"
        );

        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(tenant_id)
            .bind(domain.site_internal_id)
            .bind(domain.internal_id)
            .bind(&cert_name)
            .bind(cert_type)
            .bind(auto_renew)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("insert web_certificate pending", error))?;

        Ok((uuid, domain.hostname))
    }

    pub(super) async fn list_certificates_due_for_renewal_repo(
        &self,
        renew_before_days: u32,
        claim_expired_before: &str,
        limit: i32,
    ) -> WebServiceResult<Vec<sdkwork_webserver_contract::CertificateRenewalCandidate>> {
        use sdkwork_webserver_contract::CertificateRenewalCandidate;

        let limit = limit.clamp(1, 100);
        let engine = self.database_engine().await?;
        let claim_expired_before_expression = instant_write_expression(engine, "$3");
        let select_sql = format!(
            "SELECT c.tenant_id, c.uuid, c.cert_type, c.cert_name, c.auto_renew,
                    CAST(c.not_after AS TEXT) AS not_after,
                    COALESCE(d.hostname, c.subject, c.cert_name) AS hostname
             FROM web_certificate c
             LEFT JOIN web_domain d ON d.id = c.domain_id
             WHERE c.auto_renew = $1
               AND c.status = 1
               AND (
                    c.renewal_status IN (0, 3)
                    OR (c.renewal_status = 1 AND c.updated_at < {claim_expired_before_expression})
               )
               AND c.cert_type IN (1, 3)
               AND c.not_after IS NOT NULL
             ORDER BY c.not_after ASC
             LIMIT $2"
        );
        let rows = sqlx::query(&select_sql)
        .bind(true)
        .bind(limit)
        .bind(claim_expired_before)
        .fetch_all(&self.pool)
        .await
        .map_err(|error| store_error("list web_certificate renewal candidates", error))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in &rows {
            let not_after: String = row.try_get("not_after").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate not_after: {error}"))
            })?;
            let due_for_renewal = certificate_due_for_renewal(&not_after, renew_before_days)
                .ok_or_else(|| {
                    tracing::error!(
                        not_after,
                        "active certificate has an invalid expiry timestamp"
                    );
                    WebServiceError::Internal(
                        "active certificate has an invalid expiry timestamp".to_string(),
                    )
                })?;
            if !due_for_renewal {
                continue;
            }
            items.push(CertificateRenewalCandidate {
                tenant_id: row.try_get("tenant_id").map_err(|error| {
                    WebServiceError::Internal(format!("renewal candidate tenant_id: {error}"))
                })?,
                certificate_id: row.try_get("uuid").map_err(|error| {
                    WebServiceError::Internal(format!("renewal candidate uuid: {error}"))
                })?,
                cert_type: row.try_get("cert_type").map_err(|error| {
                    WebServiceError::Internal(format!("renewal candidate cert_type: {error}"))
                })?,
                cert_name: row.try_get("cert_name").map_err(|error| {
                    WebServiceError::Internal(format!("renewal candidate cert_name: {error}"))
                })?,
                hostname: row.try_get("hostname").map_err(|error| {
                    WebServiceError::Internal(format!("renewal candidate hostname: {error}"))
                })?,
                auto_renew: bool_from_row(row, "auto_renew").map_err(|error| {
                    WebServiceError::Internal(format!("renewal candidate auto_renew: {error}"))
                })?,
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
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let claim_expired_before_expression = instant_write_expression(engine, "$3");
        let now_expression = instant_write_expression(engine, "$4");
        let update_sql = format!(
            "UPDATE web_certificate
             SET renewal_status = 1, updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1
               AND (
                    renewal_status IN (0, 3)
                    OR (renewal_status = 1 AND updated_at < {claim_expired_before_expression})
               )
             RETURNING version"
        );
        let row = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(certificate_uuid)
            .bind(claim_expired_before)
            .bind(now)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| store_error("claim web_certificate renewal", error))?;
        row.map(|row| {
            row.try_get("version").map_err(|error| {
                WebServiceError::Internal(format!("certificate renewal claim version: {error}"))
            })
        })
        .transpose()
    }

    pub(super) async fn fail_certificate_renewal_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        expected_renewal_version: i64,
        reason: &str,
    ) -> WebServiceResult<()> {
        let row = sqlx::query(
            "SELECT CAST(metadata AS TEXT) AS metadata
             FROM web_certificate
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1
               AND renewal_status = 1 AND version = $3",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .bind(expected_renewal_version)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("load web_certificate metadata for renewal failure", error))?
        .ok_or_else(|| WebServiceError::conflict("certificate renewal claim is no longer current"))?;

        let mut existing = json_from_row(&row, "metadata")
            .map_err(|error| {
                WebServiceError::Internal(format!("renewal failure metadata: {error}"))
            })?
            .unwrap_or_else(|| json!({}));
        if let Some(object) = existing.as_object_mut() {
            object.insert(
                "renewalFailureReason".to_string(),
                serde_json::Value::String(reason.to_string()),
            );
        }

        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let metadata_expression = json_write_expression(engine, "$4");
        let now_expression = instant_write_expression(engine, "$5");
        let update_sql = format!(
            "UPDATE web_certificate
             SET renewal_status = 3, metadata = {metadata_expression},
                 updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1
               AND renewal_status = 1 AND version = $3"
        );
        let result = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(certificate_uuid)
            .bind(expected_renewal_version)
            .bind(existing.to_string())
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("fail web_certificate renewal", error))?;
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
                    CAST(c.not_after AS TEXT) AS not_after, d.hostname
             FROM web_certificate c
             INNER JOIN web_domain d ON d.id = c.domain_id
             INNER JOIN web_site s ON s.id = d.site_id
             WHERE c.tenant_id = $1 AND c.uuid = $2 AND c.status = 1
               AND d.deleted_at IS NULL AND s.deleted_at IS NULL",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve web_certificate renewal candidate", error))?
        .ok_or_else(|| WebServiceError::not_found("active certificate not found"))?;

        Ok(CertificateRenewalCandidate {
            tenant_id: row.try_get("tenant_id").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate tenant_id: {error}"))
            })?,
            certificate_id: row.try_get("uuid").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate uuid: {error}"))
            })?,
            cert_type: row.try_get("cert_type").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate cert_type: {error}"))
            })?,
            cert_name: row.try_get("cert_name").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate cert_name: {error}"))
            })?,
            hostname: row.try_get("hostname").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate hostname: {error}"))
            })?,
            auto_renew: bool_from_row(&row, "auto_renew").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate auto_renew: {error}"))
            })?,
            not_after: row.try_get("not_after").map_err(|error| {
                WebServiceError::Internal(format!("renewal candidate not_after: {error}"))
            })?,
        })
    }

    pub(super) async fn update_certificate_auto_renew_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        auto_renew: bool,
    ) -> WebServiceResult<CertificateResponse> {
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$4");
        let update_sql = format!(
            "UPDATE web_certificate
             SET auto_renew = $3, updated_at = {now_expression}, version = version + 1
             WHERE tenant_id = $1 AND uuid = $2 AND status = 1
               AND renewal_status <> 1
               AND ($3 = FALSE OR cert_type IN (1, 3))"
        );
        let result = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(certificate_uuid)
            .bind(auto_renew)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("update web_certificate auto renewal", error))?;
        if result.rows_affected() == 0 {
            let state = sqlx::query(
                "SELECT status, renewal_status
                 FROM web_certificate WHERE tenant_id = $1 AND uuid = $2",
            )
            .bind(tenant_id)
            .bind(certificate_uuid)
            .fetch_optional(&self.pool)
            .await
            .map_err(|error| store_error("load web_certificate auto renewal state", error))?;
            if let Some(row) = state {
                let status: i32 = row.try_get("status").map_err(|error| {
                    WebServiceError::Internal(format!(
                        "certificate auto renewal status: {error}"
                    ))
                })?;
                let renewal_status: i32 = row.try_get("renewal_status").map_err(|error| {
                    WebServiceError::Internal(format!(
                        "certificate auto renewal operation status: {error}"
                    ))
                })?;
                if status == 1 && renewal_status == 1 {
                    return Err(WebServiceError::conflict(
                        "certificate renewal is in progress",
                    ));
                }
            }
            return Err(WebServiceError::validation(
                "active certificate not found or certificate type is not renewable",
            ));
        }
        self.retrieve_certificate_repo(tenant_id, certificate_uuid)
            .await
    }

    pub(super) async fn finalize_certificate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        update: &CertificateIssueUpdate,
        expected_renewal_version: Option<i64>,
    ) -> WebServiceResult<CertificateResponse> {
        let metadata = json!({
            "encryptedPrivateKey": update.encrypted_private_key,
            "certPem": update.cert_pem,
            "chainPem": update.chain_pem,
            "keyVersion": 1
        });
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let not_before_expression = instant_write_expression(engine, "$12");
        let not_after_expression = instant_write_expression(engine, "$13");
        let metadata_expression = json_write_expression(engine, "$15");
        let now_expression = instant_write_expression(engine, "$16");
        let renewal_fence = expected_renewal_version
            .map(|_| " AND renewal_status = 1 AND version = $17")
            .unwrap_or_default();
        let update_sql = format!(
            "UPDATE web_certificate SET
                cert_name = $3,
                cert_type = $4,
                issuer = $5,
                subject = $6,
                san_list = $7,
                fingerprint = $8,
                cert_path = $9,
                key_path = $10,
                chain_path = $11,
                not_before = {not_before_expression},
                not_after = {not_after_expression},
                auto_renew = $14,
                renewal_status = 0,
                status = 1,
                metadata = {metadata_expression},
                updated_at = {now_expression},
                version = version + 1
             WHERE tenant_id = $1 AND uuid = $2{renewal_fence}"
        );

        let mut query = sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(certificate_uuid)
            .bind(&update.cert_name)
            .bind(update.cert_type)
            .bind(&update.issuer)
            .bind(&update.subject)
            .bind(&update.san_list)
            .bind(&update.fingerprint)
            .bind(&update.cert_path)
            .bind(&update.key_path)
            .bind(update.chain_path.as_deref())
            .bind(&update.not_before)
            .bind(&update.not_after)
            .bind(update.auto_renew)
            .bind(metadata.to_string())
            .bind(&now);
        if let Some(expected_renewal_version) = expected_renewal_version {
            query = query.bind(expected_renewal_version);
        }
        let result = query
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("finalize web_certificate", error))?;

        if result.rows_affected() == 0 {
            if expected_renewal_version.is_some() {
                return Err(WebServiceError::conflict(
                    "certificate renewal claim is no longer current",
                ));
            }
            return Err(WebServiceError::not_found("certificate not found"));
        }

        self.retrieve_certificate_repo(tenant_id, certificate_uuid)
            .await
    }

    pub(super) async fn fail_certificate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
        reason: &str,
    ) -> WebServiceResult<()> {
        let metadata = json!({ "failureReason": reason });
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let metadata_expression = json_write_expression(engine, "$3");
        let now_expression = instant_write_expression(engine, "$4");
        let update_sql = format!(
            "UPDATE web_certificate SET renewal_status = 3, status = 0,
                    metadata = {metadata_expression}, updated_at = {now_expression},
                    version = version + 1
             WHERE tenant_id = $1 AND uuid = $2"
        );
        sqlx::query(&update_sql)
            .bind(tenant_id)
            .bind(certificate_uuid)
            .bind(metadata.to_string())
            .bind(now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("fail web_certificate", error))?;
        Ok(())
    }

    pub(super) async fn retrieve_certificate_repo(
        &self,
        tenant_id: i64,
        certificate_uuid: &str,
    ) -> WebServiceResult<CertificateResponse> {
        let row = sqlx::query(
            "SELECT c.uuid, c.cert_name, d.hostname AS domain, c.cert_type, c.issuer,
                    c.fingerprint, CAST(c.not_before AS TEXT) AS not_before,
                    CAST(c.not_after AS TEXT) AS not_after, c.auto_renew,
                    c.renewal_status, c.status, CAST(c.created_at AS TEXT) AS created_at
             FROM web_certificate c
             LEFT JOIN web_domain d ON d.id = c.domain_id
             WHERE c.tenant_id = $1 AND c.uuid = $2",
        )
        .bind(tenant_id)
        .bind(certificate_uuid)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| store_error("retrieve web_certificate", error))?
        .ok_or_else(|| WebServiceError::not_found("certificate not found"))?;

        map_certificate_row(&row)
            .map_err(|error| WebServiceError::Internal(format!("map web_certificate row: {error}")))
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
                &request.domain_id,
                request.cert_type,
                request.auto_renew,
            )
            .await?;
        self.retrieve_certificate_repo(tenant_id, &uuid).await
    }
}

fn map_certificate_row(row: &EngineRow) -> Result<CertificateResponse, sqlx::Error> {
    Ok(CertificateResponse {
        id: row.try_get("uuid")?,
        cert_name: row.try_get("cert_name")?,
        domain: row.try_get("domain")?,
        cert_type: row.try_get("cert_type")?,
        issuer: row.try_get("issuer")?,
        fingerprint: row.try_get("fingerprint")?,
        not_before: optional_instant_from_row(row, "not_before")?,
        not_after: optional_instant_from_row(row, "not_after")?,
        auto_renew: Some(bool_from_row(row, "auto_renew")?),
        renewal_status: row.try_get("renewal_status")?,
        status: row.try_get("status")?,
        created_at: instant_from_row(row, "created_at")?,
    })
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
    fn database_instant_parser_accepts_sqlite_and_postgres_text_projections() {
        assert!(parse_database_instant("2027-01-01T00:00:00Z").is_some());
        assert!(parse_database_instant("2027-01-01 00:00:00+00").is_some());
        assert!(parse_database_instant("2027-01-01 00:00:00.123456+08").is_some());
        assert!(parse_database_instant("not-an-instant").is_none());
    }
}
