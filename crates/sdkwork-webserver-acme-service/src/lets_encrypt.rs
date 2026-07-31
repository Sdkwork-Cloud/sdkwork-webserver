use std::path::Path;
use std::time::Duration;

use instant_acme::{
    Account, AuthorizationStatus, ChallengeType, Identifier, NewAccount, NewOrder, OrderStatus,
    RetryPolicy,
};
use rcgen::{CertificateParams, DistinguishedName};

use crate::challenge_store::ChallengeStore;
use crate::http_client::BoundedAcmeHttpClient;
use crate::model::IssuedCertificateMaterial;
use crate::self_signed::{certificate_evidence_from_pem, generate_key_pair};
use crate::{AcmeConfig, AcmeServiceError, AcmeServiceResult};

const MAX_AUTHORIZATIONS_PER_ORDER: usize = 8;

pub async fn issue_lets_encrypt(
    config: &AcmeConfig,
    challenge_store: &ChallengeStore,
    hostnames: &[String],
    cert_name: &str,
    cert_root: &str,
    operation_timeout: Duration,
    key_algorithm: &str,
) -> AcmeServiceResult<IssuedCertificateMaterial> {
    match tokio::time::timeout(
        operation_timeout,
        issue_lets_encrypt_inner(
            config,
            challenge_store,
            hostnames,
            cert_name,
            cert_root,
            operation_timeout,
            key_algorithm,
        ),
    )
    .await
    {
        Ok(result) => result,
        Err(_) => Err(AcmeServiceError::provider(format!(
            "ACME issuance timed out after {} ms",
            operation_timeout.as_millis()
        ))),
    }
}

async fn issue_lets_encrypt_inner(
    config: &AcmeConfig,
    challenge_store: &ChallengeStore,
    hostnames: &[String],
    cert_name: &str,
    cert_root: &str,
    operation_timeout: Duration,
    key_algorithm: &str,
) -> AcmeServiceResult<IssuedCertificateMaterial> {
    let webroot = config.webroot.as_deref().map(Path::new).ok_or_else(|| {
        AcmeServiceError::config(
            "SDKWORK_WEB_ACME_WEBROOT is required for Let's Encrypt HTTP-01 issuance",
        )
    })?;

    let contact = format!("mailto:{}", config.contact_email);
    let (account, _credentials) =
        Account::builder_with_http(Box::new(BoundedAcmeHttpClient::new()?))
            .create(
                &NewAccount {
                    contact: &[&contact],
                    terms_of_service_agreed: true,
                    only_return_existing: false,
                },
                config.directory_url.clone(),
                None,
            )
            .await
            .map_err(|error| AcmeServiceError::provider(error.to_string()))?;

    if hostnames.iter().any(|hostname| hostname.starts_with("*.")) {
        return Err(AcmeServiceError::validation(
            "wildcard identifiers require DNS-01, which is not configured",
        ));
    }
    let identifiers = hostnames
        .iter()
        .cloned()
        .map(Identifier::Dns)
        .collect::<Vec<_>>();
    let mut order = account
        .new_order(&NewOrder::new(&identifiers))
        .await
        .map_err(|error| AcmeServiceError::provider(error.to_string()))?;

    let mut challenge_leases = Vec::with_capacity(hostnames.len());
    let mut authorization_count = 0_usize;
    let mut authorizations = order.authorizations();
    while let Some(result) = authorizations.next().await {
        authorization_count += 1;
        if authorization_count > MAX_AUTHORIZATIONS_PER_ORDER {
            return Err(AcmeServiceError::provider(format!(
                "ACME order exceeds {MAX_AUTHORIZATIONS_PER_ORDER} authorizations"
            )));
        }
        let mut authz = result.map_err(|error| AcmeServiceError::provider(error.to_string()))?;
        if authz.status == AuthorizationStatus::Valid {
            continue;
        }

        let mut challenge = authz
            .challenge(ChallengeType::Http01)
            .ok_or_else(|| AcmeServiceError::provider("HTTP-01 challenge unavailable"))?;
        let token = challenge.token.clone();
        let key_auth = challenge.key_authorization().as_str().to_string();
        let lease = challenge_store
            .register_scoped(Some(webroot), &token, &key_auth)
            .await?;

        challenge
            .set_ready()
            .await
            .map_err(|error| AcmeServiceError::provider(error.to_string()))?;
        challenge_leases.push(lease);
    }

    let retry_timeout = operation_timeout.min(Duration::from_secs(120));
    let policy = RetryPolicy::default().timeout(retry_timeout);
    let status = order
        .poll_ready(&policy)
        .await
        .map_err(|error| AcmeServiceError::provider(error.to_string()))?;
    if status != OrderStatus::Ready {
        return Err(AcmeServiceError::provider(format!(
            "ACME order not ready: {status:?}"
        )));
    }

    drop(challenge_leases);
    let mut params = CertificateParams::new(hostnames.to_vec())
        .map_err(|error| AcmeServiceError::Internal(error.to_string()))?;
    params.distinguished_name = DistinguishedName::new();
    let key_pair = generate_key_pair(key_algorithm)?;
    let csr = params
        .serialize_request(&key_pair)
        .map_err(|error| AcmeServiceError::Internal(error.to_string()))?;
    order
        .finalize_csr(csr.der())
        .await
        .map_err(|error| AcmeServiceError::provider(error.to_string()))?;
    let private_key_pem = key_pair.serialize_pem();
    let cert_chain_pem = order
        .poll_certificate(&policy)
        .await
        .map_err(|error| AcmeServiceError::provider(error.to_string()))?;

    let evidence = certificate_evidence_from_pem(&cert_chain_pem)?;
    let cert_dir = format!("{cert_root}/{cert_name}");
    let cert_path = format!("{cert_dir}/fullchain.pem");
    let key_path = format!("{cert_dir}/privkey.pem");

    Ok(IssuedCertificateMaterial {
        cert_name: cert_name.to_string(),
        cert_type: 1,
        issuer: evidence.issuer,
        subject: evidence.subject,
        san_list: evidence.san_list,
        serial_sha256: evidence.serial_sha256,
        fingerprint_sha256: evidence.fingerprint_sha256,
        spki_sha256: evidence.spki_sha256,
        chain_sha256: evidence.chain_sha256,
        key_algorithm: evidence.key_algorithm,
        cert_pem: cert_chain_pem.clone(),
        private_key_pem,
        chain_pem: Some(cert_chain_pem),
        not_before: evidence.not_before,
        not_after: evidence.not_after,
        cert_path,
        key_path,
        chain_path: None,
    })
}
