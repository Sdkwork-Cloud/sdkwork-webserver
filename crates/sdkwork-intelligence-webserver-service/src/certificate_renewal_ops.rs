//! Certificate renewal scan and re-issuance for autoRenew certificates.

use chrono::{Duration, Utc};
use sdkwork_webserver_contract::{
    CertificateIssueUpdate, CertificateRenewalCandidate, CertificateRenewalCycleReport,
    CertificateResponse, WebServiceError, WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

const CERTIFICATE_RENEWAL_BATCH_SIZE: i32 = 50;
const CERTIFICATE_RENEWAL_CLAIM_LEASE_SECS: i64 = 30 * 60;

impl WebService {
    pub async fn run_certificate_renewal_cycle(
        &self,
    ) -> WebServiceResult<CertificateRenewalCycleReport> {
        let renew_before_days = self.certificate_issuer.renew_before_days();
        let claim_expired_before = certificate_renewal_claim_expired_before();
        let candidates = self
            .repository
            .list_certificates_due_for_renewal(
                renew_before_days,
                &claim_expired_before,
                CERTIFICATE_RENEWAL_BATCH_SIZE,
            )
            .await?;

        let mut report = CertificateRenewalCycleReport {
            scanned: candidates.len(),
            renewed: 0,
            failed: 0,
        };

        for candidate in candidates {
            match self.renew_certificate(&candidate, true).await {
                Ok(_) => report.renewed += 1,
                Err(error) => {
                    report.failed += 1;
                    tracing::warn!(
                        tenant_id = candidate.tenant_id,
                        certificate_id = %candidate.certificate_id,
                        error = %error,
                        "certificate renewal failed"
                    );
                }
            }
        }

        Ok(report)
    }

    pub(crate) async fn renew_certificate(
        &self,
        candidate: &CertificateRenewalCandidate,
        enforce_auto_renew: bool,
    ) -> WebServiceResult<CertificateResponse> {
        validate_renewal_candidate(candidate, enforce_auto_renew)?;

        let claim_expired_before = certificate_renewal_claim_expired_before();
        let Some(claim_version) = self
            .repository
            .claim_certificate_renewal(
                candidate.tenant_id,
                &candidate.certificate_id,
                &claim_expired_before,
            )
            .await?
        else {
            return Err(WebServiceError::conflict(
                "certificate renewal already in progress",
            ));
        };

        let issue_result = self
            .certificate_issuer
            .issue(
                candidate.cert_type,
                &candidate.hostnames,
                &candidate.cert_name,
                &candidate.key_algorithm,
            )
            .await;

        let material = match issue_result {
            Ok(material) => material,
            Err(error) => {
                tracing::error!(
                    tenant_id = candidate.tenant_id,
                    certificate_id = %candidate.certificate_id,
                    error = ?error,
                    "certificate renewal provider failed"
                );
                self.record_certificate_operation_failure(
                    candidate.tenant_id,
                    &candidate.certificate_id,
                    false,
                    Some(claim_version),
                    "certificate renewal issuer failed",
                )
                .await;
                return Err(WebServiceError::Internal(
                    "certificate renewal failed".to_string(),
                ));
            }
        };

        self.persist_issued_certificate(
            candidate.tenant_id,
            &candidate.certificate_id,
            candidate.auto_renew,
            material,
            "certificates.renew",
            Some(claim_version),
        )
        .await
    }

    pub(crate) async fn persist_issued_certificate(
        &self,
        tenant_id: i64,
        certificate_id: &str,
        auto_renew: bool,
        material: sdkwork_webserver_acme_service::IssuedCertificateMaterial,
        audit_action: &str,
        expected_renewal_version: Option<i64>,
    ) -> WebServiceResult<CertificateResponse> {
        let initial_issue = audit_action == "certificates.issue";
        let update = CertificateIssueUpdate {
            cert_name: material.cert_name,
            cert_type: material.cert_type,
            issuer: material.issuer,
            subject: material.subject,
            serial_sha256: material.serial_sha256,
            fingerprint_sha256: material.fingerprint_sha256,
            spki_sha256: material.spki_sha256,
            chain_sha256: material.chain_sha256,
            key_algorithm: material.key_algorithm,
            fullchain_pem: material.cert_pem,
            private_key_pem: material.private_key_pem,
            not_before: material.not_before,
            not_after: material.not_after,
            auto_renew,
        };

        let response = match self
            .repository
            .finalize_certificate(tenant_id, certificate_id, &update, expected_renewal_version)
            .await
        {
            Ok(response) => response,
            Err(error) => {
                self.record_certificate_operation_failure(
                    tenant_id,
                    certificate_id,
                    initial_issue,
                    expected_renewal_version,
                    "certificate database finalization failed",
                )
                .await;
                return Err(error);
            }
        };

        if let Err(error) = self
            .repository
            .insert_audit_log(AuditLogWrite {
                tenant_id,
                organization_id: 0,
                operator_id: 0,
                operator_type: "JOB",
                action: audit_action,
                target_type: "certificate",
                target_id: None,
                target_uuid: Some(&response.id),
                request_id: None,
                metadata_json: "{}",
            })
            .await
        {
            tracing::error!(
                tenant_id,
                certificate_id,
                audit_action,
                error = ?error,
                "failed to persist certificate business audit"
            );
        }

        Ok(response)
    }

    pub(crate) async fn record_certificate_operation_failure(
        &self,
        tenant_id: i64,
        certificate_id: &str,
        initial_issue: bool,
        expected_renewal_version: Option<i64>,
        failure_reason: &'static str,
    ) {
        let result = if initial_issue {
            self.repository
                .fail_certificate(tenant_id, certificate_id, failure_reason)
                .await
        } else if let Some(expected_renewal_version) = expected_renewal_version {
            self.repository
                .fail_certificate_renewal(
                    tenant_id,
                    certificate_id,
                    expected_renewal_version,
                    failure_reason,
                )
                .await
        } else {
            Err(WebServiceError::Internal(
                "certificate renewal failure is missing its fencing version".to_string(),
            ))
        };
        if let Err(error) = result {
            tracing::error!(
                tenant_id,
                certificate_id,
                failure_reason,
                error = ?error,
                "failed to persist certificate operation failure state"
            );
        }
    }
}

fn certificate_renewal_claim_expired_before() -> String {
    (Utc::now() - Duration::seconds(CERTIFICATE_RENEWAL_CLAIM_LEASE_SECS)).to_rfc3339()
}

fn validate_renewal_candidate(
    candidate: &CertificateRenewalCandidate,
    enforce_auto_renew: bool,
) -> WebServiceResult<()> {
    if enforce_auto_renew && !candidate.auto_renew {
        return Err(WebServiceError::validation("auto_renew is disabled"));
    }
    if !matches!(candidate.cert_type, 1 | 3) {
        return Err(WebServiceError::validation(format!(
            "certType {} is not eligible for renewal",
            candidate.cert_type
        )));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{certificate_renewal_claim_expired_before, validate_renewal_candidate};
    use chrono::{DateTime, Duration, Utc};
    use sdkwork_webserver_contract::CertificateRenewalCandidate;

    fn certificate_due_for_renewal(not_after: &str, renew_before_days: u32) -> bool {
        let Ok(not_after) = DateTime::parse_from_rfc3339(not_after) else {
            return false;
        };
        let threshold = Utc::now() + Duration::days(i64::from(renew_before_days));
        not_after.with_timezone(&Utc) <= threshold
    }

    #[test]
    fn due_when_expiry_within_renew_window() {
        let soon = (Utc::now() + Duration::days(10)).to_rfc3339();
        assert!(certificate_due_for_renewal(&soon, 30));
    }

    #[test]
    fn not_due_when_expiry_far_future() {
        let later = (Utc::now() + Duration::days(120)).to_rfc3339();
        assert!(!certificate_due_for_renewal(&later, 30));
    }

    #[test]
    fn manual_renewal_does_not_require_auto_renew_policy() {
        let candidate = candidate(false, 1);
        assert!(validate_renewal_candidate(&candidate, false).is_ok());
        assert!(validate_renewal_candidate(&candidate, true).is_err());
    }

    #[test]
    fn unsupported_certificate_type_cannot_be_renewed() {
        assert!(validate_renewal_candidate(&candidate(true, 2), false).is_err());
    }

    #[test]
    fn renewal_claim_lease_exceeds_the_maximum_acme_operation_timeout() {
        let cutoff = DateTime::parse_from_rfc3339(&certificate_renewal_claim_expired_before())
            .expect("renewal claim cutoff");
        let age = Utc::now().signed_duration_since(cutoff.with_timezone(&Utc));
        assert!(age >= Duration::minutes(29));
        assert!(age <= Duration::minutes(31));
    }

    fn candidate(auto_renew: bool, cert_type: i32) -> CertificateRenewalCandidate {
        CertificateRenewalCandidate {
            tenant_id: 1,
            certificate_id: "certificate-id".to_string(),
            cert_type,
            cert_name: "example.test".to_string(),
            hostnames: vec!["example.test".to_string()],
            key_algorithm: "ECDSA".to_string(),
            auto_renew,
            not_after: "2027-01-01T00:00:00Z".to_string(),
        }
    }
}
