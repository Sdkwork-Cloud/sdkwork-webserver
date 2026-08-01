//! Web business service orchestrating repository ports and HTTP API traits.

pub mod agent_ops;
pub mod app;
pub mod backend;
pub mod certificate_ops;
pub mod certificate_renewal_ops;
pub mod domain_verification;
pub mod nginx_ops;
pub mod repository;
pub mod runtime_assignment_ops;
pub mod source_import;

pub use domain_verification::{DnsTxtDomainOwnershipVerifier, DomainOwnershipVerifier};
pub use repository::{
    AuditLogWrite, DomainVerificationChallenge, DomainVerificationObservation,
    RuntimeAssignmentTarget, RuntimeAssignmentWrite, RuntimeObservationWrite, WebRepositoryPort,
};
pub use source_import::{
    ApplicationSourceImporter, GitSourceImportRequest, ImportedApplicationSource,
};

use std::sync::Arc;

use sdkwork_webserver_acme_service::CertificateIssuer;
use sdkwork_webserver_contract::WebServiceResult;
use sdkwork_webserver_edge_runtime::EdgeRuntime;

/// Application service for SDKWork Web control plane operations.
pub struct WebService {
    pub(crate) repository: Arc<dyn WebRepositoryPort>,
    pub(crate) certificate_issuer: Arc<CertificateIssuer>,
    pub(crate) edge_runtime: Arc<EdgeRuntime>,
    pub(crate) source_importer: Arc<dyn ApplicationSourceImporter>,
    pub(crate) domain_ownership_verifier: Arc<dyn DomainOwnershipVerifier>,
}

impl WebService {
    pub fn new(
        repository: Arc<dyn WebRepositoryPort>,
        certificate_issuer: Arc<CertificateIssuer>,
        edge_runtime: Arc<EdgeRuntime>,
    ) -> Self {
        Self::new_with_source_importer(
            repository,
            certificate_issuer,
            edge_runtime,
            Arc::new(source_import::UnavailableApplicationSourceImporter),
        )
    }

    pub fn new_with_source_importer(
        repository: Arc<dyn WebRepositoryPort>,
        certificate_issuer: Arc<CertificateIssuer>,
        edge_runtime: Arc<EdgeRuntime>,
        source_importer: Arc<dyn ApplicationSourceImporter>,
    ) -> Self {
        Self::new_with_dependencies(
            repository,
            certificate_issuer,
            edge_runtime,
            source_importer,
            Arc::new(DnsTxtDomainOwnershipVerifier::new()),
        )
    }

    pub fn new_with_dependencies(
        repository: Arc<dyn WebRepositoryPort>,
        certificate_issuer: Arc<CertificateIssuer>,
        edge_runtime: Arc<EdgeRuntime>,
        source_importer: Arc<dyn ApplicationSourceImporter>,
        domain_ownership_verifier: Arc<dyn DomainOwnershipVerifier>,
    ) -> Self {
        Self {
            repository,
            certificate_issuer,
            edge_runtime,
            source_importer,
            domain_ownership_verifier,
        }
    }

    pub async fn ready_check(&self) -> WebServiceResult<()> {
        self.repository.ready_check().await
    }

    pub async fn record_audit_log(&self, entry: AuditLogWrite<'_>) -> WebServiceResult<()> {
        self.repository.insert_audit_log(entry).await
    }
}
