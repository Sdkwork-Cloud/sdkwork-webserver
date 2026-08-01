//! Durable certificate operation scheduling and execution.

use std::sync::Arc;

use chrono::{Duration, Utc};
use sdkwork_webserver_acme_service::{AcmeServiceError, CertificateIssuer};
use sdkwork_webserver_contract::{
    CertificateIssueUpdate, CertificateOperationCycleReport, CertificateOperationLease,
    WebServiceResult,
};
use tokio::task::JoinSet;

use crate::{AuditLogWrite, WebRepositoryPort, WebService};

const CERTIFICATE_OPERATION_BATCH_SIZE: i32 = 8;
const CERTIFICATE_OPERATION_LEASE_SECS: i64 = 30 * 60;
const CERTIFICATE_RENEWAL_SCHEDULE_BATCH_SIZE: i32 = 50;
const CERTIFICATE_RETRY_BASE_SECS: i64 = 30;
const CERTIFICATE_RETRY_MAX_SECS: i64 = 30 * 60;
const CERTIFICATE_TERMINAL_COOLDOWN_HOURS: i64 = 24;
const CERTIFICATE_LEASE_HEARTBEAT_DIVISOR: i64 = 3;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CertificateOperationOutcome {
    Succeeded,
    Retried,
    Failed,
}

impl WebService {
    pub async fn run_certificate_operation_cycle(
        &self,
        lease_owner: &str,
        schedule_renewals: bool,
    ) -> WebServiceResult<CertificateOperationCycleReport> {
        let scheduled = if schedule_renewals {
            match self
                .repository
                .schedule_due_certificate_renewals(
                    self.certificate_issuer.renew_before_days(),
                    CERTIFICATE_RENEWAL_SCHEDULE_BATCH_SIZE,
                )
                .await
            {
                Ok(scheduled) => scheduled,
                Err(error) => {
                    tracing::error!(
                        lease_owner,
                        error = ?error,
                        "automatic certificate renewal scheduling failed; continuing queued operations"
                    );
                    0
                }
            }
        } else {
            0
        };
        let leases = self
            .repository
            .claim_certificate_operations(
                lease_owner,
                CERTIFICATE_OPERATION_LEASE_SECS,
                CERTIFICATE_OPERATION_BATCH_SIZE,
            )
            .await?;
        let mut report = CertificateOperationCycleReport {
            scheduled,
            claimed: leases.len(),
            ..CertificateOperationCycleReport::default()
        };
        let mut tasks = JoinSet::new();
        for lease in leases {
            let repository = self.repository.clone();
            let certificate_issuer = self.certificate_issuer.clone();
            tasks.spawn(async move {
                execute_certificate_operation(repository, certificate_issuer, lease).await
            });
        }

        while let Some(result) = tasks.join_next().await {
            match result {
                Ok(Ok(CertificateOperationOutcome::Succeeded)) => report.succeeded += 1,
                Ok(Ok(CertificateOperationOutcome::Retried)) => report.retried += 1,
                Ok(Ok(CertificateOperationOutcome::Failed)) => report.failed += 1,
                Ok(Err(error)) => {
                    report.failed += 1;
                    tracing::error!(error = ?error, "certificate operation task failed");
                }
                Err(error) => {
                    report.failed += 1;
                    tracing::error!(error = ?error, "certificate operation task terminated");
                }
            }
        }
        Ok(report)
    }
}

async fn execute_certificate_operation(
    repository: Arc<dyn WebRepositoryPort>,
    certificate_issuer: Arc<CertificateIssuer>,
    lease: CertificateOperationLease,
) -> WebServiceResult<CertificateOperationOutcome> {
    // Long-running issuer work (DNS propagation, CA retries) may outlive the
    // original claim lease; a heartbeat keeps the fencing token's lease current
    // so a slow operation is never reaped or re-claimed while still running.
    let heartbeat = spawn_certificate_lease_heartbeat(Arc::clone(&repository), lease.clone());
    let material = match certificate_issuer
        .issue(
            lease.cert_type,
            &lease.hostnames,
            &lease.cert_name,
            &lease.key_algorithm,
        )
        .await
    {
        Ok(material) => material,
        Err(error) => {
            heartbeat.abort();
            let failure_code = certificate_issuer_failure_code(&error);
            tracing::warn!(
                tenant_id = lease.tenant_id,
                operation_id = %lease.operation_id,
                certificate_id = %lease.certificate_id,
                failure_code,
                error = ?error,
                "certificate issuer operation failed"
            );
            return persist_certificate_operation_failure(
                repository.as_ref(),
                &lease,
                failure_code,
            )
            .await;
        }
    };
    heartbeat.abort();
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
        auto_renew: lease.auto_renew,
    };
    let certificate = match repository
        .finalize_certificate_operation(&lease, &update)
        .await
    {
        Ok(certificate) => certificate,
        Err(error) => {
            tracing::error!(
                tenant_id = lease.tenant_id,
                operation_id = %lease.operation_id,
                certificate_id = %lease.certificate_id,
                error = ?error,
                "certificate operation finalization failed"
            );
            return persist_certificate_operation_failure(
                repository.as_ref(),
                &lease,
                "CERTIFICATE_FINALIZATION_FAILED",
            )
            .await;
        }
    };
    let audit_action = match lease.operation_type.as_str() {
        "ISSUE" => "certificates.issue",
        "RENEW" => "certificates.renew",
        _ => "certificates.operation",
    };
    if let Err(error) = repository
        .insert_audit_log(AuditLogWrite {
            tenant_id: lease.tenant_id,
            organization_id: 0,
            operator_id: 0,
            operator_type: "JOB",
            action: audit_action,
            target_type: "certificate",
            target_id: None,
            target_uuid: Some(&certificate.id),
            request_id: None,
            metadata_json: "{}",
        })
        .await
    {
        tracing::error!(
            tenant_id = lease.tenant_id,
            operation_id = %lease.operation_id,
            certificate_id = %lease.certificate_id,
            error = ?error,
            "failed to persist certificate completion audit"
        );
    }
    Ok(CertificateOperationOutcome::Succeeded)
}

async fn persist_certificate_operation_failure(
    repository: &dyn WebRepositoryPort,
    lease: &CertificateOperationLease,
    failure_code: &str,
) -> WebServiceResult<CertificateOperationOutcome> {
    let (retry_at, terminal_retry_at) = certificate_retry_deadlines(lease.attempt_count);
    let operation = repository
        .fail_certificate_operation(lease, failure_code, &retry_at, &terminal_retry_at)
        .await?;
    Ok(if operation.status == "FAILED" {
        CertificateOperationOutcome::Failed
    } else {
        CertificateOperationOutcome::Retried
    })
}

/// Periodically extends the lease of a RUNNING certificate operation while the
/// issuer performs its work. The heartbeat stops when the operation completes,
/// when the lease is no longer current (fencing token moved on), or when the
/// repository rejects the renewal.
fn spawn_certificate_lease_heartbeat(
    repository: Arc<dyn WebRepositoryPort>,
    lease: CertificateOperationLease,
) -> tokio::task::JoinHandle<()> {
    let heartbeat_interval_secs =
        (CERTIFICATE_OPERATION_LEASE_SECS / CERTIFICATE_LEASE_HEARTBEAT_DIVISOR).max(60);
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(
            heartbeat_interval_secs as u64,
        ));
        interval.tick().await;
        loop {
            interval.tick().await;
            match repository
                .renew_certificate_operation_lease(&lease, heartbeat_interval_secs)
                .await
            {
                Ok(()) => {}
                Err(error) => {
                    tracing::debug!(
                        tenant_id = lease.tenant_id,
                        operation_id = %lease.operation_id,
                        error = ?error,
                        "certificate operation lease heartbeat stopped"
                    );
                    break;
                }
            }
        }
    })
}

fn certificate_retry_deadlines(attempt_count: i32) -> (String, String) {
    let exponent = u32::try_from(attempt_count.saturating_sub(1))
        .unwrap_or_default()
        .min(16);
    let delay_secs = CERTIFICATE_RETRY_BASE_SECS
        .saturating_mul(1_i64.checked_shl(exponent).unwrap_or(i64::MAX))
        .min(CERTIFICATE_RETRY_MAX_SECS);
    let now = Utc::now();
    (
        (now + Duration::seconds(delay_secs)).to_rfc3339(),
        (now + Duration::hours(CERTIFICATE_TERMINAL_COOLDOWN_HOURS)).to_rfc3339(),
    )
}

fn certificate_issuer_failure_code(error: &AcmeServiceError) -> &'static str {
    match error {
        AcmeServiceError::Config(_) => "ACME_CONFIGURATION_INVALID",
        AcmeServiceError::Validation(_) => "CERTIFICATE_OPERATION_INVALID",
        AcmeServiceError::Provider(_) => "ACME_PROVIDER_FAILED",
        AcmeServiceError::Internal(_) => "CERTIFICATE_ISSUER_INTERNAL",
    }
}

#[cfg(test)]
mod tests {
    use super::{
        certificate_issuer_failure_code, certificate_retry_deadlines, CERTIFICATE_RETRY_MAX_SECS,
    };
    use chrono::{DateTime, Utc};
    use sdkwork_webserver_acme_service::AcmeServiceError;

    #[test]
    fn retry_backoff_is_bounded_and_terminal_cooldown_is_later() {
        let (retry_at, terminal_retry_at) = certificate_retry_deadlines(100);
        let retry_at = DateTime::parse_from_rfc3339(&retry_at).expect("retry instant");
        let terminal_retry_at =
            DateTime::parse_from_rfc3339(&terminal_retry_at).expect("terminal instant");
        let retry_delay = retry_at.with_timezone(&Utc) - Utc::now();
        assert!(retry_delay.num_seconds() <= CERTIFICATE_RETRY_MAX_SECS);
        assert!(terminal_retry_at > retry_at);
    }

    #[test]
    fn provider_failures_use_stable_non_sensitive_codes() {
        assert_eq!(
            certificate_issuer_failure_code(&AcmeServiceError::Provider(
                "provider detail".to_string()
            )),
            "ACME_PROVIDER_FAILED"
        );
    }
}
