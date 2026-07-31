#[derive(Clone, Debug)]
pub struct CertificateBundleMaterial {
    pub bundle_name: String,
    pub fullchain_pem: String,
    pub private_key_pem: String,
}
