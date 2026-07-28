use sdkwork_routes_webserver_backend_api::backend_route_manifest;
use sdkwork_web_core::{HttpMethod, RateLimitTier, RouteAuth};

#[test]
fn application_control_plane_routes_keep_authorization_contracts() {
    let expected = [
        (
            HttpMethod::Get,
            "applications.retrieve",
            "web.sites.read",
            false,
            None,
        ),
        (
            HttpMethod::Patch,
            "applications.update",
            "web.sites.write",
            true,
            None,
        ),
        (
            HttpMethod::Delete,
            "applications.delete",
            "web.sites.write",
            true,
            Some(RateLimitTier::AuthCritical),
        ),
        (
            HttpMethod::Post,
            "applications.activate",
            "web.sites.write",
            true,
            Some(RateLimitTier::AuthCritical),
        ),
        (
            HttpMethod::Post,
            "applications.pause",
            "web.sites.write",
            true,
            Some(RateLimitTier::AuthCritical),
        ),
        (
            HttpMethod::Delete,
            "applications.domains.delete",
            "web.sites.write",
            true,
            Some(RateLimitTier::AuthCritical),
        ),
        (
            HttpMethod::Post,
            "applications.deployments.rollback",
            "web.sites.write",
            true,
            Some(RateLimitTier::AuthCritical),
        ),
    ];
    let manifest = backend_route_manifest();

    for (method, operation_id, permission, idempotent, rate_limit_tier) in expected {
        let route = manifest
            .routes()
            .iter()
            .find(|route| route.operation_id == operation_id)
            .unwrap_or_else(|| panic!("missing route manifest entry for {operation_id}"));

        assert_eq!(route.method, method, "method mismatch for {operation_id}");
        assert_eq!(
            route.auth,
            RouteAuth::DualToken,
            "auth mismatch for {operation_id}"
        );
        assert_eq!(
            route.required_permission,
            Some(permission),
            "permission mismatch for {operation_id}"
        );
        assert_eq!(
            route.idempotent, idempotent,
            "idempotency mismatch for {operation_id}"
        );
        assert_eq!(
            route.rate_limit_tier, rate_limit_tier,
            "rate limit mismatch for {operation_id}"
        );
    }
}
