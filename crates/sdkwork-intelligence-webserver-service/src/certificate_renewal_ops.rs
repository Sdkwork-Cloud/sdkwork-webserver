//! Certificate renewal scan and re-issuance for autoRenew certificates.

use sdkwork_webserver_contract::{
    CertificateIssueUpdate, CertificateRenewalCandidate, CertificateRenewalCycleReport,
    CertificateResponse, WebServiceError, WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

impl WebService {
    pub async fn run_certificate_renewal_cycle(
        &self,
    ) -> WebServiceResult<CertificateRenewalCycleReport> {
        let renew_before_days = self.certificate_issuer.renew_before_days();
        let candidates = self
            .repository
            .list_certificates_due_for_renewal(renew_before_days, 50)
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

        if !self
            .repository
            .mark_certificate_renewing(candidate.tenant_id, &candidate.certificate_id)
            .await?
        {
            return Err(WebServiceError::conflict(
                "certificate renewal already in progress",
            ));
        }

        let issue_result = self
            .certificate_issuer
            .issue(
                candidate.cert_type,
                &candidate.hostname,
                &candidate.cert_name,
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
    ) -> WebServiceResult<CertificateResponse> {
        let initial_issue = audit_action == "certificates.issue";
        let activation = match self
            .edge_runtime
            .activate_certificate_bundle_async(&material)
            .await
        {
            Ok(activation) => activation,
            Err(error) => {
                tracing::error!(
                    tenant_id,
                    certificate_id,
                    error = ?error,
                    "certificate bundle activation failed"
                );
                self.record_certificate_operation_failure(
                    tenant_id,
                    certificate_id,
                    initial_issue,
                    "certificate bundle activation failed",
                )
                .await;
                return Err(WebServiceError::Internal(
                    "certificate activation failed".to_string(),
                ));
            }
        };

        let encrypted_private_key = match self
            .certificate_issuer
            .encrypt_private_key(&material.private_key_pem)
        {
            Ok(encrypted) => encrypted,
            Err(error) => {
                tracing::error!(
                    tenant_id,
                    certificate_id,
                    error = ?error,
                    "certificate private-key encryption failed"
                );
                if let Err(rollback_error) = activation.rollback().await {
                    tracing::error!(
                        tenant_id,
                        certificate_id,
                        error = ?rollback_error,
                        "critical: failed to compensate certificate activation after encryption failure"
                    );
                }
                self.record_certificate_operation_failure(
                    tenant_id,
                    certificate_id,
                    initial_issue,
                    "certificate private-key encryption failed",
                )
                .await;
                return Err(WebServiceError::Internal(
                    "certificate persistence failed".to_string(),
                ));
            }
        };

        let update = CertificateIssueUpdate {
            cert_name: material.cert_name,
            cert_type: material.cert_type,
            issuer: material.issuer,
            subject: material.subject,
            san_list: material.san_list,
            fingerprint: material.fingerprint,
            cert_path: material.cert_path,
            key_path: material.key_path,
            chain_path: material.chain_path,
            not_before: material.not_before,
            not_after: material.not_after,
            auto_renew,
            cert_pem: material.cert_pem.clone(),
            chain_pem: material.chain_pem.clone(),
            encrypted_private_key,
        };

        let response = match self
            .repository
            .finalize_certificate(tenant_id, certificate_id, &update)
            .await
        {
            Ok(response) => response,
            Err(error) => {
                if let Err(rollback_error) = activation.rollback().await {
                    tracing::error!(
                        tenant_id,
                        certificate_id,
                        error = ?rollback_error,
                        "critical: failed to compensate certificate activation after database failure"
                    );
                }
                self.record_certificate_operation_failure(
                    tenant_id,
                    certificate_id,
                    initial_issue,
                    "certificate database finalization failed",
                )
                .await;
                return Err(error);
            }
        };

        if let Err(error) = activation.commit().await {
            tracing::error!(
                tenant_id,
                certificate_id,
                error = ?error,
                "certificate activation committed but backup cleanup failed"
            );
        }

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
        failure_reason: &'static str,
    ) {
        let result = if initial_issue {
            self.repository
                .fail_certificate(tenant_id, certificate_id, failure_reason)
                .await
        } else {
            self.repository
                .fail_certificate_renewal(tenant_id, certificate_id, failure_reason)
                .await
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
    use super::validate_renewal_candidate;
    use chrono::{Duration, Utc};
    use sdkwork_webserver_contract::CertificateRenewalCandidate;

    fn certificate_due_for_renewal(not_after: &str, renew_before_days: u32) -> bool {
        use chrono::DateTime;
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

    fn candidate(auto_renew: bool, cert_type: i32) -> CertificateRenewalCandidate {
        CertificateRenewalCandidate {
            tenant_id: 1,
            certificate_id: "certificate-id".to_string(),
            cert_type,
            cert_name: "example.test".to_string(),
            hostname: "example.test".to_string(),
            auto_renew,
            not_after: "2027-01-01T00:00:00Z".to_string(),
        }
    }
}
