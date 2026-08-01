//! Nginx deploy, validate, and reload orchestration through the edge runtime.

use std::net::IpAddr;

use sdkwork_webserver_contract::{WebServiceError, WebServiceResult};
use sdkwork_webserver_core::upstream_ip_is_allowed;

use crate::WebService;

impl WebService {
    pub async fn validate_nginx_content(&self, content: &str) -> WebServiceResult<()> {
        let risks = scan_nginx_directive_risks(content);
        if let Some(risk) = risks.first() {
            return Err(WebServiceError::validation(format!(
                "nginx configuration is not approved for activation: {risk}"
            )));
        }
        let runtime = self.edge_runtime.clone();
        let content = content.to_owned();
        tokio::task::spawn_blocking(move || runtime.validate_config_content(&content))
            .await
            .map_err(|error| WebServiceError::Internal(format!("join nginx validation: {error}")))?
            .map_err(|error| WebServiceError::validation(error.to_string()))
    }

    pub async fn deploy_nginx_site(&self, domain: &str, content: &str) -> WebServiceResult<()> {
        let runtime = self.edge_runtime.clone();
        let domain = domain.to_owned();
        let content = content.to_owned();
        tokio::task::spawn_blocking(move || runtime.deploy_site_config(&domain, &content))
            .await
            .map_err(|error| WebServiceError::Internal(format!("join nginx deployment: {error}")))?
            .map_err(|error| WebServiceError::Internal(error.to_string()))
    }

    pub async fn reload_nginx_runtime(&self) -> WebServiceResult<()> {
        let runtime = self.edge_runtime.clone();
        tokio::task::spawn_blocking(move || runtime.reload())
            .await
            .map_err(|error| WebServiceError::Internal(format!("join nginx reload: {error}")))?
            .map_err(|error| WebServiceError::Internal(error.to_string()))
    }
}

/// Scans operator-managed Nginx site content for directives that are never
/// approved for activation. This is a fail-closed static gate in front of
/// `nginx -t`; it blocks arbitrary file inclusion, path-escape aliases, and
/// proxies to loopback/private/metadata literal addresses. Hostnames are
/// resolved by the Nginx worker at runtime, so the deployment environment must
/// additionally confine Nginx outbound traffic to approved networks.
fn scan_nginx_directive_risks(content: &str) -> Vec<String> {
    let mut risks = Vec::new();
    for statement in content.split(';') {
        let mut tokens = statement.split_whitespace();
        let Some(directive) = tokens.next() else {
            continue;
        };
        match directive {
            "include" => risks.push(
                "the include directive is forbidden; configuration must be self-contained"
                    .to_string(),
            ),
            "alias" => risks.push(
                "the alias directive is forbidden; static roots are confined to managed locations"
                    .to_string(),
            ),
            "proxy_pass" => {
                if let Some(argument) = tokens.next() {
                    if let Some(risk) = proxy_pass_risk(argument) {
                        risks.push(risk);
                    }
                }
            }
            _ => {}
        }
    }
    risks
}

fn proxy_pass_risk(argument: &str) -> Option<String> {
    let target = argument
        .strip_prefix("http://")
        .or_else(|| argument.strip_prefix("https://"))
        .or_else(|| argument.strip_prefix("grpc://"))?;
    let host = target
        .split(['/', ':', '?'])
        .next()
        .unwrap_or_default()
        .trim_matches(['[', ']']);
    if host.is_empty() {
        return Some("proxy_pass must name a concrete upstream host".to_string());
    }
    if host.eq_ignore_ascii_case("localhost") {
        return Some(
            "proxy_pass to localhost is forbidden; management surfaces must not be reachable"
                .to_string(),
        );
    }
    if let Ok(ip) = host.parse::<IpAddr>() {
        if !upstream_ip_is_allowed(ip, &[]) {
            return Some(format!(
                "proxy_pass target {host} is not an allowed upstream address"
            ));
        }
    }
    None
}
