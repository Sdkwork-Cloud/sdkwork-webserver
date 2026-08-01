//! Certificate command submission. Certificate issuance is executed by the worker.

use sdkwork_webserver_contract::{
    CertificateOperationAcceptedResponse, IssueCertificateRequest, WebAppRequestContext,
    WebServiceError, WebServiceResult,
};

use crate::{AuditLogWrite, WebService};

impl WebService {
    pub async fn enqueue_certificate_issue(
        &self,
        context: &WebAppRequestContext,
        request: &IssueCertificateRequest,
    ) -> WebServiceResult<CertificateOperationAcceptedResponse> {
        Self::validate_certificate_issue_request(request)?;
        if context.tenant_id <= 0 {
            return Err(WebServiceError::Forbidden);
        }
        let owner_id = Self::owner_filter(context)?;
        let operation = self
            .repository
            .enqueue_certificate_issue(
                context.tenant_id,
                owner_id,
                context.actor_id,
                request,
                context.idempotency_key.as_deref(),
            )
            .await?;
        self.audit_certificate_command(
            context.tenant_id,
            context.organization_id.unwrap_or(0),
            context.actor_id.unwrap_or(0),
            "USER",
            "certificates.issue.requested",
            &operation.operation_id,
        )
        .await;
        Ok(operation)
    }

    pub(crate) async fn audit_certificate_command(
        &self,
        tenant_id: i64,
        organization_id: i64,
        operator_id: i64,
        operator_type: &'static str,
        action: &'static str,
        operation_id: &str,
    ) {
        if let Err(error) = self
            .repository
            .insert_audit_log(AuditLogWrite {
                tenant_id,
                organization_id,
                operator_id,
                operator_type,
                action,
                target_type: "certificate_operation",
                target_id: None,
                target_uuid: Some(operation_id),
                request_id: None,
                metadata_json: "{}",
            })
            .await
        {
            tracing::error!(
                tenant_id,
                operator_id,
                action,
                operation_id,
                error = ?error,
                "failed to persist certificate command audit"
            );
        }
    }
}
