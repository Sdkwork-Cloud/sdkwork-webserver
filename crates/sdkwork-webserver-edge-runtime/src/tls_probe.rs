use std::fmt;
use std::net::TcpStream;
use std::sync::Arc;
use std::time::Duration;

use rustls::client::danger::{HandshakeSignatureValid, ServerCertVerified, ServerCertVerifier};
use rustls::crypto::{verify_tls12_signature, verify_tls13_signature, WebPkiSupportedAlgorithms};
use rustls::pki_types::{CertificateDer, ServerName, UnixTime};
use rustls::{
    ClientConfig, ClientConnection, DigitallySignedStruct, Error as RustlsError, SignatureScheme,
};
use sdkwork_utils_rust::crypto::sha256_hash;

use crate::{EdgeRuntimeConfig, EdgeRuntimeError, EdgeRuntimeResult};

const TLS_FINGERPRINT_MISMATCH: &str = "served TLS leaf certificate fingerprint mismatch";

pub fn verify_served_certificate(
    config: &EdgeRuntimeConfig,
    hostname: &str,
    expected_fingerprint_sha256: &str,
) -> EdgeRuntimeResult<()> {
    validate_fingerprint(expected_fingerprint_sha256)?;
    let server_name = ServerName::try_from(hostname.to_string()).map_err(|error| {
        EdgeRuntimeError::Config(format!("invalid TLS verification hostname: {error}"))
    })?;
    let provider = rustls::crypto::aws_lc_rs::default_provider();
    let verifier = LeafFingerprintVerifier {
        expected_fingerprint_sha256: expected_fingerprint_sha256.to_string(),
        supported_algorithms: provider.signature_verification_algorithms,
    };
    let client_config = ClientConfig::builder_with_provider(Arc::new(provider))
        .with_safe_default_protocol_versions()
        .map_err(|error| {
            EdgeRuntimeError::Config(format!("configure TLS verification client: {error}"))
        })?
        .dangerous()
        .with_custom_certificate_verifier(Arc::new(verifier))
        .with_no_client_auth();
    let mut connection = ClientConnection::new(Arc::new(client_config), server_name)
        .map_err(|error| EdgeRuntimeError::Config(format!("start TLS verification: {error}")))?;
    let timeout = Duration::from_millis(config.tls_verify_timeout_ms);
    let mut socket =
        TcpStream::connect_timeout(&config.tls_verify_address, timeout).map_err(|error| {
            EdgeRuntimeError::Filesystem(format!(
                "connect local TLS listener {}: {error}",
                config.tls_verify_address
            ))
        })?;
    socket.set_read_timeout(Some(timeout)).map_err(|error| {
        EdgeRuntimeError::Filesystem(format!("set local TLS read timeout: {error}"))
    })?;
    socket.set_write_timeout(Some(timeout)).map_err(|error| {
        EdgeRuntimeError::Filesystem(format!("set local TLS write timeout: {error}"))
    })?;
    while connection.is_handshaking() {
        connection.complete_io(&mut socket).map_err(|error| {
            EdgeRuntimeError::Config(format!("verify served TLS certificate: {error}"))
        })?;
    }
    Ok(())
}

fn validate_fingerprint(value: &str) -> EdgeRuntimeResult<()> {
    if value.len() != 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
    {
        return Err(EdgeRuntimeError::Config(
            "TLS certificate fingerprint must be 64 lowercase hexadecimal characters".to_string(),
        ));
    }
    Ok(())
}

struct LeafFingerprintVerifier {
    expected_fingerprint_sha256: String,
    supported_algorithms: WebPkiSupportedAlgorithms,
}

impl fmt::Debug for LeafFingerprintVerifier {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("LeafFingerprintVerifier")
            .finish_non_exhaustive()
    }
}

impl ServerCertVerifier for LeafFingerprintVerifier {
    fn verify_server_cert(
        &self,
        end_entity: &CertificateDer<'_>,
        _intermediates: &[CertificateDer<'_>],
        _server_name: &ServerName<'_>,
        _ocsp_response: &[u8],
        _now: UnixTime,
    ) -> Result<ServerCertVerified, RustlsError> {
        if sha256_hash(end_entity.as_ref()) == self.expected_fingerprint_sha256 {
            Ok(ServerCertVerified::assertion())
        } else {
            Err(RustlsError::General(TLS_FINGERPRINT_MISMATCH.to_string()))
        }
    }

    fn verify_tls12_signature(
        &self,
        message: &[u8],
        certificate: &CertificateDer<'_>,
        signature: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, RustlsError> {
        verify_tls12_signature(message, certificate, signature, &self.supported_algorithms)
    }

    fn verify_tls13_signature(
        &self,
        message: &[u8],
        certificate: &CertificateDer<'_>,
        signature: &DigitallySignedStruct,
    ) -> Result<HandshakeSignatureValid, RustlsError> {
        verify_tls13_signature(message, certificate, signature, &self.supported_algorithms)
    }

    fn supported_verify_schemes(&self) -> Vec<SignatureScheme> {
        self.supported_algorithms.supported_schemes()
    }
}

#[cfg(test)]
mod tests {
    use super::validate_fingerprint;

    #[test]
    fn tls_probe_fingerprint_is_strict_lowercase_sha256() {
        assert!(validate_fingerprint(&"a".repeat(64)).is_ok());
        assert!(validate_fingerprint(&"A".repeat(64)).is_err());
        assert!(validate_fingerprint("short").is_err());
    }
}
