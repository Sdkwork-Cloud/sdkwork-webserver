# REQ-2026-0067 Detached Custom Domain Assets

```yaml
id: REQ-2026-0067
title: Register custom domains before application binding and manage multiple certificates per domain
owner: sdkwork-web-server
status: in-progress
source: user
problem: Custom domains can currently be created only inside an application, and certificate issuance requires operators to enter a raw domain id. Operators need to prepare domain and certificate assets before application configuration is ready, then bind them without bypassing Web Server deployment and TLS runtime contracts.
goals:
  - Make custom domains first-class tenant assets that may exist without an application binding.
  - Allow an unbound domain to be verified and to own multiple canonical certificate records.
  - Bind and unbind a domain from an application as an explicit audited operation.
  - Preserve the existing application-scoped domain APIs as compatible views and commands over bound domains.
  - Present application and domain choices by business name in the backend-admin UI instead of requiring raw ids.
  - Keep detached domains and their certificates out of Nginx, Node Sync Manifest, website runtime, and TLS runtime activation.
  - Compile bound domain and certificate choices through the existing SDKWork Web Server configuration, deployment, certificateRefs, SNI validation, and atomic activation contracts.
non_goals:
  - Allowing one hostname to bypass duplicate SNI ownership checks.
  - Claiming same-name RSA/ECDSA negotiation before the HTTPS PRD runtime boundary supports it.
  - Storing private keys, provider credentials, or certificate PEM in application-owned configuration or API responses.
  - Replacing domain ownership challenges with a database-only status change.
users:
  - tenant Web Server administrators preparing customer domains
  - application operators binding prepared domains to Web or API applications
  - certificate operators issuing and renewing TLS assets
acceptance_criteria:
  - Backend administrators can page through all tenant domains and create a domain with no application id.
  - Domain responses expose optional application identity and a certificate count without returning private material.
  - A detached domain can later be bound to one tenant application; moving it to another application requires an explicit unbind first.
  - Unbinding clears primary-domain state and detaches every certificate from the application scope without deleting the domain or certificate assets.
  - Deleting a domain asset is rejected while it is bound or while certificate records reference it.
  - The existing application-domain delete operation performs an unbind and leaves the domain asset available in the tenant domain inventory.
  - A domain may have multiple certificate rows; no uniqueness rule restricts domain_id to one certificate.
  - Backend certificate creation accepts a detached tenant domain, while app-console certificate creation remains owner and application scoped.
  - Detached-domain certificates are listable to authorized backend operators but are excluded from node certificate distribution until the domain is bound.
  - The backend-admin Domain page supports create, verify, bind, unbind, issue-certificate, and delete flows with state-aware availability and confirmation for runtime-affecting or destructive actions.
  - Certificate issuance selects a domain by hostname and application label rather than asking the operator for a raw domain id.
  - Domain and certificate lists remain store-paginated.
non_functional_requirements:
  security: Tenant filtering is enforced in repository queries. Detached private-key material is never distributed to a node. Domain verification remains subject to the HTTPS ownership-evidence contract.
  reliability: Binding and unbinding update domain and certificate application scope in one transaction. Runtime effects continue through immutable deployment and node synchronization contracts.
  usability: Asset state clearly distinguishes unbound, bound, unverified, verified, and certificate count without relying on internal identifiers.
affected_surfaces:
  - database
  - api
  - sdk
  - backend
  - pc
  - deployment
  - tls
trace:
  specs:
    - API_SPEC.md
    - PAGINATION_SPEC.md
    - DATABASE_SPEC.md
    - WEB_BACKEND_SPEC.md
    - SDK_SPEC.md
    - BACKEND_UI_SPEC.md
    - DEPLOYMENT_SPEC.md
    - NGINX_SPEC.md
    - SECURITY_SPEC.md
    - TEST_SPEC.md
  components:
    - database
    - crates/sdkwork-webserver-contract
    - crates/sdkwork-intelligence-webserver-service
    - crates/sdkwork-intelligence-webserver-repository-sqlx
    - crates/sdkwork-routes-webserver-backend-api
    - sdks/sdkwork-web-backend-sdk
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-admin-domains
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-admin-certificates
verification:
  - pnpm db:validate
  - cargo test -p sdkwork-intelligence-webserver-repository-sqlx --test repository_parity sqlite_repository_transactions_tenants_idempotency_and_pagination_are_bounded -- --exact
  - cargo test -p sdkwork-intelligence-webserver-service
  - cargo test -p sdkwork-routes-webserver-backend-api
  - pnpm api:check
  - pnpm sdk:generate:check
  - node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
  - pnpm --dir apps/sdkwork-webserver-pc check
```

## Change Control

- 2026-07-30: Renumbered from the duplicate provisional id `REQ-2026-0066` to
  `REQ-2026-0067`. The canonical `REQ-2026-0066` remains Idempotency Contract Closure.

## Product Decision

A domain is a durable tenant asset, not an application child. `web_domain.site_id` is an optional current binding. Certificates remain canonical child assets of a domain, so one domain can retain multiple issuance, renewal, algorithm, or replacement records without duplicating the domain.

Binding is control-plane intent, not proof of deployment. A detached domain or certificate cannot enter Nginx, Node Sync Manifest, website runtime, or TLS runtime output. After binding, deployment still compiles through `sdkwork.webserver.app`, including bounded `certificateRefs`, hostname coverage, duplicate SNI rejection, protected material references, and atomic activation.
