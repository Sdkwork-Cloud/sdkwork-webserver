# REQ-2026-0068 Root Domain Zone Management

```yaml
id: REQ-2026-0068
title: Manage root domains as zones with paged hostname and deployment views
owner: sdkwork-web-server
status: in-progress
source: user
problem: Tenant domains are currently exposed as one flat hostname inventory. Operators need to define a root domain first, open a dedicated page for that root, and manage its apex and subdomain hostnames together with application, deployment, verification, and HTTPS state.
goals:
  - Make a root domain a first-class tenant-owned zone resource.
  - Open every root domain on a stable backend-admin route.
  - Page through apex and subdomain hostnames within one root domain.
  - Bind each hostname to one application and expose the latest application deployment without duplicating deployment authority.
  - Preserve the existing flat domain APIs as compatibility operations.
  - Keep ownership verification, certificate issuance, and runtime activation fail closed.
non_goals:
  - Acting as an authoritative DNS provider or claiming A, AAAA, CNAME, MX, or TXT record propagation.
  - Duplicating application deployment state on root-domain or hostname rows.
  - Inferring root-domain ownership from public suffix heuristics in the browser.
users:
  - tenant Web Server administrators
  - application deployment operators
  - certificate operators
acceptance_criteria:
  - Backend administrators can page, search, create, retrieve, and delete root domains.
  - Clicking a root domain opens `/admin/root-domains/{rootDomainId}`.
  - The detail page pages through hostname records belonging to that root domain.
  - `@` creates the apex hostname and labels such as `www` or `api` create normalized child hostnames.
  - Hostname rows expose application binding, verification, HTTPS, certificates, and latest deployment state.
  - Root-domain deletion is rejected while any hostname belongs to the root.
  - Root-domain and hostname queries remain tenant-filtered and store-paginated.
  - Existing detached-domain and application-domain operations remain compatible.
affected_surfaces:
  - database
  - api
  - sdk
  - backend
  - pc
trace:
  specs:
    - DATABASE_SPEC.md
    - API_SPEC.md
    - PAGINATION_SPEC.md
    - WEB_BACKEND_SPEC.md
    - SDK_SPEC.md
    - BACKEND_UI_SPEC.md
    - TEST_SPEC.md
  components:
    - database
    - crates/sdkwork-webserver-contract
    - crates/sdkwork-intelligence-webserver-service
    - crates/sdkwork-intelligence-webserver-repository-sqlx
    - crates/sdkwork-routes-webserver-backend-api
    - sdks/sdkwork-web-backend-sdk
    - apps/sdkwork-webserver-pc/packages/sdkwork-webserver-pc-admin-domains
verification:
  - pnpm db:validate
  - cargo test -p sdkwork-intelligence-webserver-repository-sqlx
  - cargo test -p sdkwork-intelligence-webserver-service
  - cargo test -p sdkwork-routes-webserver-backend-api
  - pnpm api:check
  - pnpm sdk:generate:check
  - node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
  - pnpm --dir apps/sdkwork-webserver-pc check
```

## Product Decision

A root domain is an explicitly defined Zone. A hostname is a publishable apex or subdomain asset
inside that Zone. Hostnames retain the existing application binding, verification, certificate,
and runtime semantics. The latest deployment shown beside a hostname is a read projection from its
bound application's deployment history and never a second deployment state machine.
