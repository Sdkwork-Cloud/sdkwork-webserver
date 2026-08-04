//! End-to-end ACME lifecycle test against a local Pebble CA.
//!
//! Ignored by default: requires the `pebble` and `pebble-challtestsrv`
//! binaries in `$PATH` (or the `PEBBLE` / `CHALLTESTSRV` environment
//! variables). Binary downloads: <https://github.com/letsencrypt/pebble/releases>.
//!
//! The test exercises the full control-plane issuance contract against a real
//! ACME server: durable encrypted account persistence, HTTP-01 challenge
//! material written into the webroot and served by a local HTTP server (the
//! data plane role), issuance evidence validation, and account reuse across
//! a second issuance. Run with:
//!
//! ```text
//! cargo test -p sdkwork-webserver-acme-service --test pebble_lifecycle -- --ignored
//! ```

use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::Duration;

use axum::{routing::get, Router};
use rcgen::{CertificateParams, DistinguishedName, DnType, Ia5String, KeyPair, SanType};
use rustls_pki_types::pem::PemObject;
use rustls_pki_types::CertificateDer;
use sdkwork_webserver_acme_service::{
    AcmeConfig, CertificateIssuer, EncryptedFileAcmeAccountStore, ExtraRootsClientFactory,
};
use tempfile::TempDir;
use tokio::net::TcpListener;

const PEBBLE_DIRECTORY_URL: &str = "https://127.0.0.1:14000/dir";
const PEBBLE_HTTP_CHALLENGE_PORT: u16 = 5002;

struct Subprocess(Option<Child>);

impl Subprocess {
    fn spawn(command: &mut Command) -> std::io::Result<Self> {
        Ok(Self(Some(command.spawn()?)))
    }
}

impl Drop for Subprocess {
    fn drop(&mut self) {
        if let Some(mut child) = self.0.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

fn resolve_binary(env_name: &str, default: &str) -> PathBuf {
    std::env::var(env_name)
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from(default))
}

fn write_pebble_identity(directory: &Path) -> (String, String) {
    let mut params = CertificateParams::new(Vec::new()).expect("certificate params");
    params.distinguished_name = DistinguishedName::new();
    params.distinguished_name.push(DnType::CommonName, "pebble");
    params.subject_alt_names = vec![
        SanType::DnsName(Ia5String::try_from("localhost").expect("localhost dns name")),
        SanType::IpAddress(std::net::IpAddr::V4(std::net::Ipv4Addr::LOCALHOST)),
        SanType::IpAddress(std::net::IpAddr::V6(std::net::Ipv6Addr::LOCALHOST)),
    ];
    let key = KeyPair::generate().expect("generate pebble key");
    let certificate = params.self_signed(&key).expect("self-sign pebble identity");
    let certificate_path = directory.join("pebble-cert.pem");
    let key_path = directory.join("pebble-key.pem");
    std::fs::write(&certificate_path, certificate.pem()).expect("write pebble certificate");
    std::fs::write(&key_path, key.serialize_pem()).expect("write pebble key");
    (
        certificate_path.to_string_lossy().into_owned(),
        key_path.to_string_lossy().into_owned(),
    )
}

fn write_pebble_config(directory: &Path, certificate: &str, private_key: &str) -> PathBuf {
    let config = serde_json::json!({
        "pebble": {
            "listenAddress": "127.0.0.1:14000",
            "managementListenAddress": "127.0.0.1:15000",
            "certificate": certificate,
            "privateKey": private_key,
            "httpPort": PEBBLE_HTTP_CHALLENGE_PORT,
            "tlsPort": 5001,
            "ocspResponderURL": "",
            "externalAccountBindingRequired": false,
            "externalAccountMACKeys": {},
            "domainBlocklist": [],
            "retryAfter": {"authz": 1, "order": 1, "challenge": 1, "request": 1},
            "profiles": {
                "default": {
                    "description": "pebble test profile",
                    "validityPeriod": 7776000
                }
            }
        }
    });
    let path = directory.join("pebble-config.json");
    std::fs::write(
        &path,
        serde_json::to_vec_pretty(&config).expect("serialize pebble config"),
    )
    .expect("write pebble config");
    path
}

async fn wait_for_directory(client: &reqwest::Client, url: &str) {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(30);
    loop {
        if client.get(url).send().await.is_ok() {
            return;
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "pebble directory did not become ready at {url}"
        );
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
}

fn challenge_router(webroot: PathBuf) -> Router {
    Router::new().route(
        "/.well-known/acme-challenge/{token}",
        get(
            move |axum::extract::Path(token): axum::extract::Path<String>| async move {
                let token_bytes = token.as_bytes();
                if token_bytes.is_empty()
                    || token_bytes.len() > 256
                    || !token_bytes
                        .iter()
                        .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
                {
                    return (axum::http::StatusCode::NOT_FOUND, String::new());
                }
                let path = webroot
                    .join(".well-known")
                    .join("acme-challenge")
                    .join(&token);
                match tokio::fs::read_to_string(&path).await {
                    Ok(content) => (axum::http::StatusCode::OK, content),
                    Err(_) => (axum::http::StatusCode::NOT_FOUND, String::new()),
                }
            },
        ),
    )
}

#[tokio::test]
#[ignore = "requires pebble and pebble-challtestsrv binaries"]
async fn full_issuance_lifecycle_against_pebble() {
    let pebble_path = resolve_binary("PEBBLE", "./pebble");
    let challtestsrv_path = resolve_binary("CHALLTESTSRV", "./pebble-challtestsrv");
    if !pebble_path.exists() || !challtestsrv_path.exists() {
        panic!(
            "pebble binaries are required: {} and {} (see https://github.com/letsencrypt/pebble/releases)",
            pebble_path.display(),
            challtestsrv_path.display()
        );
    }

    let temp = TempDir::new().expect("temp dir");
    let (certificate, private_key) = write_pebble_identity(temp.path());
    let pebble_config = write_pebble_config(temp.path(), &certificate, &private_key);

    // The challenge test server provides DNS resolution (all names -> loopback)
    // but no challenge services; the data-plane role HTTP server serves the
    // webroot files on the pebble-configured HTTP challenge port.
    let challtestsrv = Subprocess::spawn(
        Command::new(&challtestsrv_path)
            .arg("-management")
            .arg(":8055")
            .arg("-dnsserver")
            .arg(":8053")
            .arg("-http01")
            .arg("")
            .arg("-tlsalpn01")
            .arg("")
            .arg("-https01")
            .arg("")
            .arg("-doh")
            .arg("")
            .stdout(Stdio::null())
            .stderr(Stdio::null()),
    )
    .expect("spawn pebble-challtestsrv");

    let pebble = Subprocess::spawn(
        Command::new(&pebble_path)
            .env("PEBBLE_AUTHZREUSE", "0")
            .arg("-config")
            .arg(&pebble_config)
            .arg("-dnsserver")
            .arg("127.0.0.1:8053")
            .arg("-strict")
            .stdout(Stdio::null())
            .stderr(Stdio::null()),
    )
    .expect("spawn pebble");

    let webroot = temp.path().join("webroot");
    std::fs::create_dir_all(webroot.join(".well-known").join("acme-challenge"))
        .expect("create webroot");

    let listener = TcpListener::bind(("0.0.0.0", PEBBLE_HTTP_CHALLENGE_PORT))
        .await
        .expect("bind HTTP-01 challenge port");
    let challenge_webroot = webroot.clone();
    let challenge_server = tokio::spawn(async move {
        axum::serve(listener, challenge_router(challenge_webroot))
            .await
            .expect("serve HTTP-01 challenges");
    });

    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .expect("reqwest client");
    wait_for_directory(&client, PEBBLE_DIRECTORY_URL).await;

    // Trust the pebble identity as the CA root for the ACME client.
    let pebble_der = CertificateDer::from_pem_slice(
        &std::fs::read(temp.path().join("pebble-cert.pem")).expect("read pebble certificate"),
    )
    .expect("parse pebble certificate");
    let client_factory =
        std::sync::Arc::new(ExtraRootsClientFactory::new(vec![pebble_der.clone()]));
    let account_root = temp.path().join("accounts");
    let account_store = std::sync::Arc::new(EncryptedFileAcmeAccountStore::new(
        account_root.clone(),
        b"test-master-key-00000000000000000000000000",
    ));
    let issuer = CertificateIssuer::new_with_client_factory(
        AcmeConfig::new(
            PEBBLE_DIRECTORY_URL.to_string(),
            "admin@example.com".to_string(),
            30,
            Some(webroot.to_string_lossy().into_owned()),
            false,
        )
        .expect("acme config"),
        temp.path().join("live").to_string_lossy().into_owned(),
        180_000,
        account_store.clone(),
        client_factory,
    )
    .expect("issuer");

    let first = issuer
        .issue(
            1,
            &["http01.example.com".to_string()],
            "http01-example",
            "ECDSA",
        )
        .await
        .expect("first issuance through pebble");
    assert_eq!(first.cert_type, 1);
    assert!(first.cert_pem.contains("BEGIN CERTIFICATE"));
    assert!(first.private_key_pem.contains("PRIVATE KEY"));
    let account_files_after_first = std::fs::read_dir(&account_root)
        .expect("read account root")
        .count();
    assert!(
        account_files_after_first > 0,
        "durable account credentials must be persisted"
    );

    // A second issuance reuses the persisted account instead of creating a
    // new one: the account file count must stay unchanged.
    let second = issuer
        .issue(
            1,
            &["second.example.com".to_string()],
            "second-example",
            "ECDSA",
        )
        .await
        .expect("second issuance through pebble");
    assert!(second.cert_pem.contains("BEGIN CERTIFICATE"));
    let account_files_after_second = std::fs::read_dir(&account_root)
        .expect("read account root")
        .count();
    assert_eq!(
        account_files_after_second, account_files_after_first,
        "second issuance must reuse the persisted ACME account"
    );

    drop((pebble, challtestsrv));
    challenge_server.abort();
}
