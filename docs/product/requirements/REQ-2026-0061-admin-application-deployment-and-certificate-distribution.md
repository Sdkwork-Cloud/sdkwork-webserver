# REQ-2026-0061 Admin Application Deployment And Certificate Distribution

```yaml
id: REQ-2026-0061
title: Manage application deployment, public domains, and convergent certificate distribution from backend admin
owner: sdkwork-web-server
status: in-progress
source: operator
problem: The tenant console exposes site, domain, deployment, and certificate workflows, but the backend-admin surface has no application deployment or certificate modules. The existing siteType field describes the runtime technology and cannot represent the operator-facing WEB/API application category. Certificate renewal and Web Node synchronization exist, but operators cannot manage the canonical certificate lifecycle or observe fleet convergence from the admin surface.
goals:
  - Add backend-admin application workflows for creating WEB/API applications, binding and verifying public domains, and creating deployments.
  - Keep applicationType independent from the existing siteType runtime technology classification.
  - Add an independent backend-admin certificate module for issuance, automatic-renewal policy, manual renewal, and distribution status.
  - Preserve exactly one canonical certificate record and encrypted private-key authority per certificate while distributing replaceable runtime copies to every Web Node in the tenant fleet.
  - Make certificate renewal change the canonical fingerprint so the shared immutable Node Sync Manifest version changes and every Web Node converges through the existing pull/apply/reload/heartbeat protocol.
non_goals:
  - Creating one database certificate row per server.
  - Adding a second certificate synchronization loop or a second certificate authority.
  - Cross-tenant platform administration through the tenant-bound backend-api context.
  - Replacing the existing Node Sync Manifest with push-based SSH or direct filesystem mutation.
users:
  - backend operators deploying tenant WEB and API applications
  - certificate and Web Node fleet operators
acceptance_criteria:
  - Backend OpenAPI and the generated Backend SDK expose application list/create, domain list/create/verify, and deployment list/create operations.
  - New applications persist applicationType as WEB or API without changing the meaning of siteType.
  - Backend OpenAPI and the generated Backend SDK expose certificate list/create/update/renew and certificate-distribution list operations.
  - Automatic renewal updates the existing canonical certificate record and changes the tenant Node Sync Manifest version when the leaf fingerprint changes.
  - Every registered server reports its last applied manifest version, and admin distribution status compares that observation with one current desired manifest version.
  - The PC backend-admin surface contains independent Applications and Certificates capability packages and calls only the generated Backend SDK through admin-core injection.
  - Private keys never appear in admin API responses, UI state, logs, or generated frontend models.
non_functional_requirements:
  security: Tenant context and backend permissions are mandatory; private keys remain encrypted at rest and are decrypted only while producing the authenticated bounded Node Sync Manifest.
  privacy: No new personal data is introduced.
  performance: All interactive lists use bounded SQL pagination; Node Sync Manifest bounds remain unchanged.
  reliability: Canonical certificate update, versioned distribution, atomic node activation, real reload, and observed-version heartbeat remain fail-closed.
affected_surfaces:
  - api
  - sdk
  - backend
  - database
  - pc
  - deployment
trace:
  specs:
    - API_SPEC.md
    - PAGINATION_SPEC.md
    - WEB_BACKEND_SPEC.md
    - DATABASE_SPEC.md
    - SDK_SPEC.md
    - BACKEND_UI_SPEC.md
    - SECURITY_SPEC.md
    - DEPLOYMENT_SPEC.md
  components:
    - crates/sdkwork-routes-webserver-backend-api
    - crates/sdkwork-intelligence-webserver-service
    - crates/sdkwork-intelligence-webserver-repository-sqlx
    - crates/sdkwork-webserver-certificate-worker
    - crates/sdkwork-web-agent
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-admin-applications
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-admin-certificates
verification:
  - cargo test -p sdkwork-routes-webserver-backend-api
  - cargo test -p sdkwork-intelligence-webserver-service
  - cargo test -p sdkwork-intelligence-webserver-repository-sqlx --test repository_parity sqlite_repository
  - cargo test -p sdkwork-webserver-certificate-worker
  - pnpm sdk:generate:backend
  - pnpm --dir apps/sdkwork-webserver-pc check
  - node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
  - pnpm check:api-envelope
```

## Decision

The implementation follows [ADR-20260726-admin-application-and-certificate-control-plane.md](../../architecture/decisions/ADR-20260726-admin-application-and-certificate-control-plane.md). Existing accepted ACME, certificate-distribution, and durable Node Daemon decisions remain authoritative.
