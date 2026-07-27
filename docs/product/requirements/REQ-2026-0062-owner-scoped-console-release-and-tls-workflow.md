# REQ-2026-0062 Owner-Scoped Console Release And TLS Workflow

```yaml
id: REQ-2026-0062
title: Publish owner-scoped applications with Drive-backed artifacts, domains, and certificates
owner: sdkwork-web-server
status: in-progress
source: user
problem: Authenticated app users can enter the Web Server Console, but a page-level IAM denial blocks normal workflows and the existing deployment form does not upload an immutable package. Certificate creation also requires a raw domain id, and tenant-level certificate queries risk exposing another user's resources. Administrators and normal users need separate product surfaces without hiding the shared Console shell or sign-out command.
goals:
  - Keep the complete Console shell and sign-out command visible for every authenticated account, with resource-level unauthorized states for unavailable capabilities.
  - List and mutate only sites owned by the authenticated app user, including configuration, domains, deployments, and certificates.
  - Upload a non-empty application archive through the generated Drive App SDK before creating the Web Server deployment command.
  - Persist a stable Drive resource URI, package size, lowercase SHA-256 digest, environment, version metadata, and idempotency key without storing signed URLs, object keys, or provider credentials.
  - Select certificate domains from the currently selected owned application and filter certificate queries by that application at the repository boundary.
  - Show deployment history and asynchronous status truthfully, and permit rollback only from a successful deployment while preserving artifact identity.
  - Route Web Server administrators to the isolated `/admin` surface and normal app users to `/console`.
non_goals:
  - Copying Drive upload APIs into the Web App SDK or replacing generated SDK calls with raw HTTP.
  - Treating package upload or deployment-command acceptance as proof that a version is serving traffic.
  - Storing signed delivery URLs, storage-provider object keys, access tokens, certificate private keys, or ambient tenant/user identity in deployment requests.
  - Adding a database migration; the existing deployment artifact and version columns remain authoritative.
users:
  - application owners publishing Web and API applications
  - application owners configuring custom domains and TLS certificates
  - tenant Web Server administrators
acceptance_criteria:
  - An app user sees only their own applications; a second user in the same tenant cannot list or mutate the first user's applications, domains, deployments, or certificates.
  - Certificate list accepts an optional siteId, verifies owner access, and performs owner plus site filtering in SQL.
  - Certificate creation rejects a domain owned by another app user in the same tenant.
  - The Console release action requires an archive, reports upload progress, computes SHA-256, uploads through Drive, and submits the stable Drive URI and artifact metadata through the generated Web App SDK.
  - Deployment responses expose environment, version and source metadata, artifact identity, status, start/completion timestamps, and duration.
  - Rollback records inherit the selected deployment's version, source, and artifact fields and are unavailable in the Console unless the selected deployment succeeded.
  - The Console shell and sign-out command remain visible without Web permissions; unavailable resources show an IAM access state.
  - Admin permission scope lands on `/admin`; non-admin access to `/admin/*` redirects to `/console`.
  - No Console module constructs authentication headers, parses credentials, or calls remote APIs outside injected generated/composed SDK clients.
non_functional_requirements:
  security: Owner scope is enforced by service and repository boundaries, not by frontend filtering. Drive and Web SDK clients share the IAM bootstrap TokenManager.
  privacy: Cross-owner data is not returned even when users share a tenant.
  performance: Application, domain, deployment, and certificate lists remain store-paginated; browser uploads use the Drive multipart uploader.
  reliability: Deployment state remains pending until an execution authority advances it; retries use an idempotency key and rollbacks preserve immutable artifact provenance.
affected_surfaces:
  - api
  - sdk
  - backend
  - pc
  - iam
  - deployment
trace:
  specs:
    - API_SPEC.md
    - PAGINATION_SPEC.md
    - SDK_SPEC.md
    - APP_SDK_INTEGRATION_SPEC.md
    - IAM_SPEC.md
    - SECURITY_SPEC.md
    - DEPLOYMENT_SPEC.md
    - FRONTEND_CODE_SPEC.md
    - TEST_SPEC.md
  components:
    - crates/sdkwork-routes-webserver-app-api
    - crates/sdkwork-intelligence-webserver-service
    - crates/sdkwork-intelligence-webserver-repository-sqlx
    - sdks/sdkwork-web-app-sdk
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-console-core
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-commons
verification:
  - cargo test -p sdkwork-intelligence-webserver-service
  - cargo test -p sdkwork-routes-webserver-app-api
  - cargo test -p sdkwork-intelligence-webserver-repository-sqlx --test repository_parity sqlite_repository_transactions_tenants_idempotency_and_pagination_are_bounded -- --exact
  - pnpm sdk:generate:check
  - pnpm --dir apps/sdkwork-webserver-pc check
  - node ../sdkwork-specs/tools/check-app-sdk-consumer-imports.mjs --workspace .
  - node ../sdkwork-specs/tools/check-permission-composition.mjs --workspace .
```

## Decision

The Web Server remains the authority for sites, domains, certificates, and deployment records. Drive owns browser package upload and returns the stable resource identity stored by Web Server. A separate deployment execution authority is still required to advance accepted records from pending to running, successful, or failed; until that authority reports evidence, the Console must show the command as pending rather than published.
