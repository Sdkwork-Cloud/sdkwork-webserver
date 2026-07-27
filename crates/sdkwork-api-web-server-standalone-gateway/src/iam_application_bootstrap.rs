use std::path::PathBuf;

use sdkwork_iam_embedded_application_bootstrap::{
    ensure_tenant_application_from_app_root_with_env_and_fallback, resolve_bootstrap_environment,
};

pub async fn ensure_web_tenant_application_bootstrap() -> Result<(), String> {
    let app_root = resolve_web_app_root();
    sdkwork_iam_database_host::unified_postgres_env::apply_unified_claw_postgres_env(&app_root);
    sdkwork_iam_database_host::bootstrap_iam_database_from_env()
        .await
        .map_err(|error| format!("initialize IAM database lifecycle failed: {error}"))?;
    ensure_tenant_application_from_app_root_with_env_and_fallback(
        resolve_bootstrap_environment().as_str(),
        app_root,
        None,
        &[],
    )
    .await
    .map_err(|error| format!("provision Web Server IAM tenant applications failed: {error}"))
}

fn resolve_web_app_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn web_app_root_resolves_to_repository_manifest_root() {
        let root = resolve_web_app_root();
        assert!(root.join("sdkwork.app.config.json").is_file());
        assert!(root
            .join("apps/sdkwork-webserver-pc/sdkwork.app.config.json")
            .is_file());
    }
}
