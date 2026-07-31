use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Semaphore;

use crate::challenge_store::ChallengeStore;
use crate::config::AcmeConfig;
use crate::lets_encrypt::issue_lets_encrypt;
use crate::model::IssuedCertificateMaterial;
use crate::self_signed::issue_self_signed;
use crate::{AcmeServiceError, AcmeServiceResult};
use crate::{
    DEFAULT_ACME_OPERATION_TIMEOUT_MS, MAX_ACME_OPERATION_TIMEOUT_MS, MIN_ACME_OPERATION_TIMEOUT_MS,
};

const MAX_CONCURRENT_CERTIFICATE_ISSUANCE: usize = 8;
const MAX_CERTIFICATE_IDENTIFIERS: usize = 8;

pub struct CertificateIssuer {
    config: AcmeConfig,
    challenge_store: Arc<ChallengeStore>,
    cert_root: String,
    operation_timeout: Duration,
    admission: Semaphore,
}

impl CertificateIssuer {
    pub fn new(config: AcmeConfig, cert_root: impl Into<String>) -> AcmeServiceResult<Self> {
        Self::new_with_operation_timeout_ms(config, cert_root, DEFAULT_ACME_OPERATION_TIMEOUT_MS)
    }

    pub fn new_with_operation_timeout_ms(
        config: AcmeConfig,
        cert_root: impl Into<String>,
        operation_timeout_ms: u64,
    ) -> AcmeServiceResult<Self> {
        config.validate()?;
        let cert_root = cert_root.into();
        if cert_root.is_empty()
            || cert_root.len() > 4_096
            || cert_root
                .bytes()
                .any(|byte| byte == 0 || byte.is_ascii_control())
        {
            return Err(AcmeServiceError::config(
                "certificate live root must contain 1..4096 safe path bytes",
            ));
        }
        if !(MIN_ACME_OPERATION_TIMEOUT_MS..=MAX_ACME_OPERATION_TIMEOUT_MS)
            .contains(&operation_timeout_ms)
        {
            return Err(AcmeServiceError::config(format!(
                "ACME operation timeout must be between {MIN_ACME_OPERATION_TIMEOUT_MS} and {MAX_ACME_OPERATION_TIMEOUT_MS} ms"
            )));
        }
        Ok(Self {
            config,
            challenge_store: Arc::new(ChallengeStore::default()),
            cert_root,
            operation_timeout: Duration::from_millis(operation_timeout_ms),
            admission: Semaphore::new(MAX_CONCURRENT_CERTIFICATE_ISSUANCE),
        })
    }

    pub fn challenge_store(&self) -> Arc<ChallengeStore> {
        self.challenge_store.clone()
    }

    pub fn cert_root(&self) -> &str {
        &self.cert_root
    }

    pub fn renew_before_days(&self) -> u32 {
        self.config.renew_before_days
    }

    pub async fn issue(
        &self,
        cert_type: i32,
        hostnames: &[String],
        cert_name: &str,
        key_algorithm: &str,
    ) -> AcmeServiceResult<IssuedCertificateMaterial> {
        if hostnames.is_empty() || hostnames.len() > MAX_CERTIFICATE_IDENTIFIERS {
            return Err(AcmeServiceError::validation(format!(
                "certificate identifiers must contain 1..{MAX_CERTIFICATE_IDENTIFIERS} hostnames"
            )));
        }
        let mut unique_hostnames = std::collections::HashSet::with_capacity(hostnames.len());
        for hostname in hostnames {
            validate_hostname(hostname)?;
            if !unique_hostnames.insert(hostname.as_str()) {
                return Err(AcmeServiceError::validation(
                    "certificate identifiers must be unique",
                ));
            }
        }
        if !matches!(key_algorithm, "ECDSA" | "RSA") {
            return Err(AcmeServiceError::validation(
                "keyAlgorithm must be ECDSA or RSA",
            ));
        }
        validate_certificate_name(cert_name)?;
        let _permit = self.admission.try_acquire().map_err(|_| {
            AcmeServiceError::provider(format!(
                "certificate issuance capacity exhausted; maximum concurrent operations: {MAX_CONCURRENT_CERTIFICATE_ISSUANCE}"
            ))
        })?;
        match cert_type {
            1 => {
                issue_lets_encrypt(
                    &self.config,
                    self.challenge_store.as_ref(),
                    hostnames,
                    cert_name,
                    &self.cert_root,
                    self.operation_timeout,
                    key_algorithm,
                )
                .await
            }
            3 => issue_self_signed(hostnames, cert_name, &self.cert_root, key_algorithm),
            other => Err(AcmeServiceError::validation(format!(
                "unsupported certType {other}; supported: 1 (Let's Encrypt), 3 (self-signed)"
            ))),
        }
    }
}

fn validate_hostname(hostname: &str) -> AcmeServiceResult<()> {
    let hostname = hostname.strip_prefix("*.").unwrap_or(hostname);
    if hostname.is_empty()
        || hostname.len() > 253
        || hostname.starts_with('.')
        || hostname.ends_with('.')
        || hostname.split('.').any(|label| {
            label.is_empty()
                || label.len() > 63
                || label.starts_with('-')
                || label.ends_with('-')
                || !label
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
        })
    {
        return Err(AcmeServiceError::validation(
            "hostname must be a safe ASCII DNS name",
        ));
    }
    Ok(())
}

fn validate_certificate_name(cert_name: &str) -> AcmeServiceResult<()> {
    if cert_name.is_empty()
        || cert_name.len() > 253
        || matches!(cert_name, "." | "..")
        || cert_name.starts_with('.')
        || cert_name.ends_with('.')
        || cert_name.contains("..")
        || !cert_name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'))
    {
        return Err(AcmeServiceError::validation(
            "certificate name must contain 1..253 safe ASCII name bytes",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn issues_self_signed_certificate() {
        let config = AcmeConfig::new(
            "https://acme-staging-v02.api.letsencrypt.org/directory".to_string(),
            "admin@example.com".to_string(),
            30,
            None,
            false,
        )
        .expect("config");
        let issuer = CertificateIssuer::new(config, "/tmp/certs/live").expect("issuer");
        let material = issuer
            .issue(3, &["dev.localhost".to_string()], "dev-localhost", "ECDSA")
            .await
            .expect("issue");
        assert_eq!(material.cert_type, 3);
        assert!(material.cert_pem.contains("BEGIN CERTIFICATE"));
        assert!(material.private_key_pem.contains("BEGIN PRIVATE KEY"));
    }

    #[test]
    fn rejects_unbounded_operation_timeout() {
        let config = AcmeConfig::new(
            "https://acme-staging-v02.api.letsencrypt.org/directory".to_string(),
            "admin@example.com".to_string(),
            30,
            None,
            false,
        )
        .expect("config");
        assert!(
            CertificateIssuer::new_with_operation_timeout_ms(config, "/tmp/certs", 9_999).is_err()
        );
    }

    #[tokio::test]
    async fn rejects_unsafe_hostname_and_certificate_name() {
        let config = AcmeConfig::new(
            "https://acme-staging-v02.api.letsencrypt.org/directory".to_string(),
            "admin@example.com".to_string(),
            30,
            None,
            false,
        )
        .expect("config");
        let issuer = CertificateIssuer::new(config, "/tmp/certs/live").expect("issuer");
        assert!(issuer
            .issue(3, &["../escape".to_string()], "safe-name", "ECDSA")
            .await
            .is_err());
        assert!(issuer
            .issue(3, &["dev.localhost".to_string()], "../escape", "ECDSA")
            .await
            .is_err());
    }

    #[tokio::test]
    async fn issuance_admission_has_no_waiter_queue() {
        let config = AcmeConfig::new(
            "https://acme-staging-v02.api.letsencrypt.org/directory".to_string(),
            "admin@example.com".to_string(),
            30,
            None,
            false,
        )
        .expect("config");
        let issuer = CertificateIssuer::new(config, "/tmp/certs/live").expect("issuer");
        let permits = (0..MAX_CONCURRENT_CERTIFICATE_ISSUANCE)
            .map(|_| issuer.admission.try_acquire().expect("permit"))
            .collect::<Vec<_>>();
        let error = issuer
            .issue(3, &["dev.localhost".to_string()], "dev-localhost", "ECDSA")
            .await
            .expect_err("capacity must fail closed");
        assert!(error.to_string().contains("capacity exhausted"));
        drop(permits);
        issuer
            .issue(3, &["dev.localhost".to_string()], "dev-localhost", "ECDSA")
            .await
            .expect("capacity recovers");
    }
}
