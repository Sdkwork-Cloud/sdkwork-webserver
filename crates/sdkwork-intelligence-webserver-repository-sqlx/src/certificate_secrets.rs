use serde::{Deserialize, Serialize};
use sdkwork_utils_rust::{aes_gcm_decrypt, aes_gcm_encrypt, derive_aes_256_key};
use sdkwork_webserver_contract::{WebServiceError, WebServiceResult};

use crate::SecretEncryptionKey;

pub(super) const CERTIFICATE_SECRET_ENCRYPTION_ALGORITHM: &str = "AES_256_GCM_V1";

const CERTIFICATE_SECRET_PAYLOAD_VERSION: u8 = 1;
const CERTIFICATE_SECRET_KEY_CONTEXT: &[u8] = b"sdkwork-web-certificate-secret-bundle-v1";
const MAX_FULLCHAIN_PEM_BYTES: usize = 1024 * 1024;
const MAX_PRIVATE_KEY_PEM_BYTES: usize = 128 * 1024;
const MAX_ENCRYPTED_BUNDLE_BYTES: usize = 2 * 1024 * 1024;

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StoredCertificateSecretBundle {
    version: u8,
    tenant_id: i64,
    certificate_version_uuid: String,
    fullchain_pem: String,
    private_key_pem: String,
}

pub(super) struct CertificateSecretBundle {
    pub fullchain_pem: String,
    pub private_key_pem: String,
}

pub(super) fn certificate_secret_ref(certificate_version_uuid: &str) -> String {
    format!("secret:{certificate_version_uuid}")
}

pub(super) fn encrypt_certificate_secret_bundle(
    master_key: &SecretEncryptionKey,
    tenant_id: i64,
    certificate_version_uuid: &str,
    fullchain_pem: &str,
    private_key_pem: &str,
) -> WebServiceResult<String> {
    validate_certificate_secret_material(fullchain_pem, private_key_pem)?;
    let payload = StoredCertificateSecretBundle {
        version: CERTIFICATE_SECRET_PAYLOAD_VERSION,
        tenant_id,
        certificate_version_uuid: certificate_version_uuid.to_string(),
        fullchain_pem: fullchain_pem.to_string(),
        private_key_pem: private_key_pem.to_string(),
    };
    let plaintext = serde_json::to_vec(&payload).map_err(|_| {
        WebServiceError::Internal("encode certificate secret bundle".to_string())
    })?;
    let derived_key = certificate_secret_key(master_key, tenant_id, certificate_version_uuid);
    let encrypted = aes_gcm_encrypt(&derived_key, &plaintext).map_err(|_| {
        WebServiceError::Internal("encrypt certificate secret bundle".to_string())
    })?;
    if encrypted.len() > MAX_ENCRYPTED_BUNDLE_BYTES {
        return Err(WebServiceError::validation(
            "encrypted certificate secret bundle exceeds the storage limit",
        ));
    }
    Ok(encrypted)
}

pub(super) fn decrypt_certificate_secret_bundle(
    master_key: &SecretEncryptionKey,
    tenant_id: i64,
    certificate_version_uuid: &str,
    secret_bundle_ref: &str,
    encryption_algorithm: &str,
    bundle_encrypted: &str,
) -> WebServiceResult<CertificateSecretBundle> {
    if secret_bundle_ref != certificate_secret_ref(certificate_version_uuid)
        || encryption_algorithm != CERTIFICATE_SECRET_ENCRYPTION_ALGORITHM
        || bundle_encrypted.len() > MAX_ENCRYPTED_BUNDLE_BYTES
    {
        return Err(WebServiceError::Internal(
            "certificate secret bundle metadata is invalid".to_string(),
        ));
    }
    let derived_key = certificate_secret_key(master_key, tenant_id, certificate_version_uuid);
    let plaintext = aes_gcm_decrypt(&derived_key, bundle_encrypted).map_err(|_| {
        WebServiceError::Internal("decrypt certificate secret bundle".to_string())
    })?;
    let payload: StoredCertificateSecretBundle = serde_json::from_slice(&plaintext).map_err(|_| {
        WebServiceError::Internal("decode certificate secret bundle".to_string())
    })?;
    if payload.version != CERTIFICATE_SECRET_PAYLOAD_VERSION
        || payload.tenant_id != tenant_id
        || payload.certificate_version_uuid != certificate_version_uuid
    {
        return Err(WebServiceError::Internal(
            "certificate secret bundle scope is invalid".to_string(),
        ));
    }
    validate_certificate_secret_material(&payload.fullchain_pem, &payload.private_key_pem)
        .map_err(|_| {
            WebServiceError::Internal("certificate secret bundle material is invalid".to_string())
        })?;
    Ok(CertificateSecretBundle {
        fullchain_pem: payload.fullchain_pem,
        private_key_pem: payload.private_key_pem,
    })
}

fn certificate_secret_key(
    master_key: &SecretEncryptionKey,
    tenant_id: i64,
    certificate_version_uuid: &str,
) -> SecretEncryptionKey {
    let salt = format!("{tenant_id}:{certificate_version_uuid}");
    derive_aes_256_key(master_key, salt.as_bytes(), CERTIFICATE_SECRET_KEY_CONTEXT)
}

fn validate_certificate_secret_material(
    fullchain_pem: &str,
    private_key_pem: &str,
) -> WebServiceResult<()> {
    if fullchain_pem.is_empty()
        || fullchain_pem.len() > MAX_FULLCHAIN_PEM_BYTES
        || !fullchain_pem.contains("-----BEGIN CERTIFICATE-----")
        || !fullchain_pem.contains("-----END CERTIFICATE-----")
    {
        return Err(WebServiceError::validation(
            "certificate full chain PEM is invalid",
        ));
    }
    if private_key_pem.is_empty()
        || private_key_pem.len() > MAX_PRIVATE_KEY_PEM_BYTES
        || !private_key_pem.contains("-----BEGIN ")
        || !private_key_pem.contains("PRIVATE KEY-----")
        || !private_key_pem.contains("-----END ")
    {
        return Err(WebServiceError::validation(
            "certificate private key PEM is invalid",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FULLCHAIN: &str =
        "-----BEGIN CERTIFICATE-----\ncertificate\n-----END CERTIFICATE-----\n";
    const PRIVATE_KEY: &str =
        "-----BEGIN PRIVATE KEY-----\nprivate-key\n-----END PRIVATE KEY-----\n";

    #[test]
    fn certificate_secret_bundle_round_trips_with_exact_scope() {
        let key = [7_u8; 32];
        let version_uuid = "10000000-0000-4000-8000-000000000001";
        let encrypted = encrypt_certificate_secret_bundle(
            &key,
            42,
            version_uuid,
            FULLCHAIN,
            PRIVATE_KEY,
        )
        .expect("encrypt certificate bundle");
        assert!(!encrypted.contains("PRIVATE KEY"));

        let decrypted = decrypt_certificate_secret_bundle(
            &key,
            42,
            version_uuid,
            &certificate_secret_ref(version_uuid),
            CERTIFICATE_SECRET_ENCRYPTION_ALGORITHM,
            &encrypted,
        )
        .expect("decrypt certificate bundle");
        assert_eq!(decrypted.fullchain_pem, FULLCHAIN);
        assert_eq!(decrypted.private_key_pem, PRIVATE_KEY);
    }

    #[test]
    fn certificate_secret_bundle_rejects_scope_transplant() {
        let key = [9_u8; 32];
        let version_uuid = "20000000-0000-4000-8000-000000000001";
        let encrypted = encrypt_certificate_secret_bundle(
            &key,
            42,
            version_uuid,
            FULLCHAIN,
            PRIVATE_KEY,
        )
        .expect("encrypt certificate bundle");

        assert!(decrypt_certificate_secret_bundle(
            &key,
            43,
            version_uuid,
            &certificate_secret_ref(version_uuid),
            CERTIFICATE_SECRET_ENCRYPTION_ALGORITHM,
            &encrypted,
        )
        .is_err());
    }
}
