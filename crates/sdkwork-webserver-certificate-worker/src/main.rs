//! Background certificate renewal worker: scans autoRenew certificates and re-issues before expiry.

use std::time::Duration;

use sdkwork_intelligence_webserver_repository_sqlx::bootstrap_web_runtime_from_env;
use tracing::{info, warn};

const DEFAULT_SCAN_INTERVAL_SECS: u64 = 3_600;
const MIN_SCAN_INTERVAL_SECS: u64 = 60;
const MAX_SCAN_INTERVAL_SECS: u64 = 86_400;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    sdkwork_database_sqlx::enable_process_shared_database_pool();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let interval_value = std::env::var("SDKWORK_WEB_CERT_RENEW_SCAN_INTERVAL_SECS").ok();
    let interval_secs = parse_scan_interval_secs(interval_value.as_deref())?;

    info!(
        interval_secs,
        "sdkwork-webserver-certificate-worker started"
    );

    let runtime = bootstrap_web_runtime_from_env()
        .await
        .map_err(|error| anyhow::anyhow!(error))?;
    let mut shutdown_task = tokio::spawn(shutdown_signal());
    tokio::task::yield_now().await;

    loop {
        match runtime.service.run_certificate_renewal_cycle().await {
            Ok(report) => {
                if report.scanned > 0 {
                    info!(
                        scanned = report.scanned,
                        renewed = report.renewed,
                        failed = report.failed,
                        "certificate renewal cycle completed"
                    );
                }
            }
            Err(error) => {
                warn!(error = %error, "certificate renewal cycle failed");
            }
        }
        tokio::select! {
            result = &mut shutdown_task => {
                result
                    .map_err(|error| anyhow::anyhow!("certificate worker shutdown task failed: {error}"))?
                    .map_err(|error| anyhow::anyhow!("certificate worker shutdown listener failed: {error}"))?;
                info!("certificate renewal worker stopped after completing the active cycle");
                break;
            }
            () = tokio::time::sleep(Duration::from_secs(interval_secs)) => {}
        }
    }

    Ok(())
}

fn parse_scan_interval_secs(value: Option<&str>) -> anyhow::Result<u64> {
    let interval = match value {
        None => DEFAULT_SCAN_INTERVAL_SECS,
        Some(value) => value.parse::<u64>().map_err(|_| {
            anyhow::anyhow!(
                "SDKWORK_WEB_CERT_RENEW_SCAN_INTERVAL_SECS must be an integer between {MIN_SCAN_INTERVAL_SECS} and {MAX_SCAN_INTERVAL_SECS}"
            )
        })?,
    };
    if !(MIN_SCAN_INTERVAL_SECS..=MAX_SCAN_INTERVAL_SECS).contains(&interval) {
        anyhow::bail!(
            "SDKWORK_WEB_CERT_RENEW_SCAN_INTERVAL_SECS must be between {MIN_SCAN_INTERVAL_SECS} and {MAX_SCAN_INTERVAL_SECS}"
        );
    }
    Ok(interval)
}

async fn shutdown_signal() -> std::io::Result<()> {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};

        let mut interrupt = signal(SignalKind::interrupt())?;
        let mut terminate = signal(SignalKind::terminate())?;
        tokio::select! {
            _ = interrupt.recv() => Ok(()),
            _ = terminate.recv() => Ok(()),
        }
    }

    #[cfg(not(unix))]
    {
        tokio::signal::ctrl_c().await
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_scan_interval_secs, DEFAULT_SCAN_INTERVAL_SECS};

    #[test]
    fn scan_interval_defaults_and_accepts_bounded_values() {
        assert_eq!(
            parse_scan_interval_secs(None).expect("default interval"),
            DEFAULT_SCAN_INTERVAL_SECS
        );
        assert_eq!(parse_scan_interval_secs(Some("60")).unwrap(), 60);
        assert_eq!(parse_scan_interval_secs(Some("86400")).unwrap(), 86_400);
    }

    #[test]
    fn scan_interval_rejects_hot_loops_overflow_and_invalid_text() {
        for value in ["0", "59", "86401", "18446744073709551616", "one-hour"] {
            assert!(parse_scan_interval_secs(Some(value)).is_err(), "{value}");
        }
    }
}
