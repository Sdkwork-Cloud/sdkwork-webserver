# ADR-20260730 Detached Domain Assets And Certificate Bindings

Status: accepted
Requirement: REQ-2026-0067
Owner: sdkwork-web-server
Date: 2026-07-30
Specs: DATABASE_SPEC.md, API_SPEC.md, WEB_BACKEND_SPEC.md, SDK_SPEC.md, BACKEND_UI_SPEC.md, DEPLOYMENT_SPEC.md, NGINX_SPEC.md, SECURITY_SPEC.md

## Context

`web_domain.site_id` is currently mandatory, so a tenant cannot prepare domain ownership or certificates before an application exists. The Backend certificate form also exposes the storage identifier `domainId` as operator input. `web_certificate.domain_id` already permits multiple certificate rows for one domain, but detached assets are not representable and the application-scoped delete route removes the domain record instead of only removing its binding.

The authored Web Server configuration already supports bounded plural `certificateRefs`, while runtime validation rejects ambiguous duplicate SNI ownership. Node certificate distribution joins certificates through a live domain and application, which is the correct fail-closed activation boundary.

## Decision

- Make `web_domain.site_id` nullable and treat it as the optional current application binding.
- Keep `web_certificate.domain_id` as the canonical one-to-many relationship. Do not add a parallel JSON association or duplicate certificate row on each application.
- Keep `web_certificate.site_id` as a derived application-scope projection for owner-scoped Console queries. Binding and unbinding update it transactionally for every certificate on the domain.
- Add tenant-level Backend domain collection, verification, application-binding, and deletion operations. Existing nested application-domain routes remain compatible views over bound assets.
- Make nested application-domain deletion detach the binding. Tenant-level domain deletion remains a distinct operation and is blocked while an application or certificate references the domain.
- Allow Backend certificate issuance for detached domains. Owner-scoped App API issuance still requires a domain bound to an owned application.
- Continue excluding detached certificates from Node Sync Manifest through the existing certificate-domain-site join.
- Represent multiple certificates in product UI as a count and repeatable issue workflow. Selection and activation remain governed by the existing Web Server configuration, `certificateRefs`, hostname coverage, duplicate ownership, and runtime validation.

## Consequences

Domain preparation no longer depends on application creation. Rebinding is explicit: an operator must unbind before selecting a different application, which avoids an accidental live traffic move. Existing domain and certificate identifiers remain stable, and existing application-scoped SDK methods remain available.

The schema change is additive in capability but requires a reviewed migration because it relaxes a foreign-key column from required to optional. Detached certificates may renew, but they remain absent from node distribution until the domain is bound. Same-name multi-certificate negotiation is not enabled by this decision; runtime duplicate-name constraints remain authoritative.

## Verification

- Database contract, migration, SQLite/PostgreSQL repository parity, and transaction tests.
- Backend route manifest, OpenAPI response envelope, operation naming, pagination, and route collision checks.
- Generated Backend SDK regeneration and PC package typecheck/tests/build.
- Tests proving detached assets are tenant visible, owner hidden, transactionally rebound, and excluded from node distribution.

## Supersedes / Superseded By

This decision extends `ADR-20260726-admin-application-and-certificate-control-plane` and `REQ-2026-0006`. It does not supersede their certificate runtime or distribution constraints.
