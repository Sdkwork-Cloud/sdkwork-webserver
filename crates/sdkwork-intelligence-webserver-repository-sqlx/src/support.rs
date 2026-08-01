use sdkwork_database_config::DatabaseEngine;
use sdkwork_database_id::{uuid_v4, uuid_v4_with_prefix, SnowflakeIdGenerator};
use sdkwork_utils_rust::crypto::sha256_hash;
use sdkwork_webserver_contract::WebServiceError;
use super::{EnginePool, EngineRow};
use sqlx::{Error as SqlxError, Row};

pub(crate) fn now_rfc3339() -> String {
    sdkwork_utils_rust::datetime::format_datetime(sdkwork_utils_rust::datetime::now(), None)
}

pub(crate) fn store_error(context: &str, error: SqlxError) -> WebServiceError {
    tracing::error!(context, error = ?error, "database operation failed");
    match error {
        SqlxError::Database(db) => match db.code().as_deref() {
            Some("23505") => WebServiceError::conflict("resource already exists"),
            Some("23503" | "23514" | "22P02") => {
                WebServiceError::validation("database constraint rejected the request")
            }
            Some("40001" | "40P01" | "55P03" | "57014") => {
                WebServiceError::DatabaseUnavailable
            }
            _ => WebServiceError::Internal("database operation failed".to_string()),
        },
        SqlxError::RowNotFound => WebServiceError::not_found("resource not found"),
        SqlxError::PoolTimedOut
        | SqlxError::PoolClosed
        | SqlxError::Io(_)
        | SqlxError::Tls(_) => WebServiceError::DatabaseUnavailable,
        _ => WebServiceError::Internal("database operation failed".to_string()),
    }
}

pub(crate) fn is_unique_violation(error: &SqlxError) -> bool {
    matches!(error, SqlxError::Database(database) if database.code().as_deref() == Some("23505"))
}

pub(crate) fn pagination(
    page: i32,
    page_size: i32,
) -> Result<(i32, i32, i64), WebServiceError> {
    if page < 1 {
        return Err(WebServiceError::validation("page must be greater than or equal to 1"));
    }
    if !(1..=200).contains(&page_size) {
        return Err(WebServiceError::validation(
            "page_size must be between 1 and 200",
        ));
    }
    let offset = (i64::from(page) - 1)
        .checked_mul(i64::from(page_size))
        .ok_or_else(|| WebServiceError::validation("pagination offset is too large"))?;
    Ok((page, page_size, offset))
}

pub(crate) fn next_id(generator: &SnowflakeIdGenerator) -> Result<i64, WebServiceError> {
    generator
        .generate()
        .map_err(|error| WebServiceError::Internal(error.to_string()))
}

pub(crate) fn new_uuid() -> String {
    uuid_v4()
}

pub(crate) fn new_agent_token() -> String {
    uuid_v4_with_prefix("wagent_")
}

pub(crate) fn sha256_hex(content: &str) -> String {
    sha256_hash(content.as_bytes())
}

pub(crate) fn bool_from_row(row: &EngineRow, column: &str) -> Result<bool, SqlxError> {
    if let Ok(value) = row.try_get::<bool, _>(column) {
        return Ok(value);
    }
    let value: i64 = row.try_get(column)?;
    Ok(value != 0)
}

pub(crate) fn json_from_row(
    row: &EngineRow,
    column: &str,
) -> Result<Option<serde_json::Value>, SqlxError> {
    let raw: Option<String> = row.try_get(column)?;
    raw.map(|text| serde_json::from_str(&text).map_err(|error| SqlxError::Decode(Box::new(error))))
        .transpose()
}

pub(crate) fn json_write_expression(engine: DatabaseEngine, placeholder: &str) -> String {
    match engine {
        DatabaseEngine::Sqlite => placeholder.to_string(),
        DatabaseEngine::Postgres => format!("CAST({placeholder} AS JSONB)"),
    }
}

pub(crate) fn instant_write_expression(engine: DatabaseEngine, placeholder: &str) -> String {
    match engine {
        DatabaseEngine::Sqlite => placeholder.to_string(),
        DatabaseEngine::Postgres => format!("CAST({placeholder} AS TIMESTAMPTZ)"),
    }
}

pub(crate) fn instant_from_row(row: &EngineRow, column: &str) -> Result<String, SqlxError> {
    let value: String = row.try_get(column)?;
    normalize_database_instant(&value).ok_or_else(|| invalid_instant_error(column, &value))
}

pub(crate) fn optional_instant_from_row(
    row: &EngineRow,
    column: &str,
) -> Result<Option<String>, SqlxError> {
    let value: Option<String> = row.try_get(column)?;
    value
        .map(|value| {
            normalize_database_instant(&value).ok_or_else(|| invalid_instant_error(column, &value))
        })
        .transpose()
}

fn normalize_database_instant(value: &str) -> Option<String> {
    chrono::DateTime::parse_from_rfc3339(value)
        .or_else(|_| chrono::DateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S%.f%#z"))
        .ok()
        .map(|value| {
            sdkwork_utils_rust::datetime::format_datetime(value.with_timezone(&chrono::Utc), None)
        })
}

fn invalid_instant_error(column: &str, value: &str) -> SqlxError {
    SqlxError::ColumnDecode {
        index: column.to_string(),
        source: Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!("invalid database instant: {value}"),
        )),
    }
}

pub(crate) async fn resolve_site_internal_id(
    pool: &EnginePool,
    tenant_id: i64,
    site_uuid: &str,
) -> Result<i64, WebServiceError> {
    let row = sqlx::query(
        "SELECT id FROM web_site
         WHERE tenant_id = $1 AND uuid = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(site_uuid)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("resolve web_site id", error))?;

    let row = row.ok_or_else(|| WebServiceError::not_found("site not found"))?;
    row.try_get("id")
        .map_err(|error| store_error("map web_site id", error))
}

pub(crate) async fn resolve_site_owner_id(
    pool: &EnginePool,
    tenant_id: i64,
    site_id: i64,
) -> Result<Option<i64>, WebServiceError> {
    sqlx::query_scalar(
        "SELECT user_id FROM web_site
         WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL",
    )
    .bind(tenant_id)
    .bind(site_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| store_error("resolve web_site owner", error))?
    .ok_or_else(|| WebServiceError::not_found("site not found"))
}

#[cfg(test)]
mod tests {
    use super::{normalize_database_instant, pagination};

    #[test]
    fn pagination_rejects_invalid_inputs_and_computes_offset_without_i32_overflow() {
        assert!(pagination(-10, 20).is_err());
        assert!(pagination(1, 0).is_err());
        assert!(pagination(1, 201).is_err());
        assert_eq!(
            pagination(i32::MAX, 200).unwrap(),
            (i32::MAX, 200, 429_496_729_200)
        );
    }

    #[test]
    fn database_instants_are_normalized_to_rfc3339_utc() {
        let expected = "2027-01-01T00:00:00.123Z";
        assert_eq!(normalize_database_instant(expected).as_deref(), Some(expected));
        assert_eq!(
            normalize_database_instant("2027-01-01 08:00:00.123+08").as_deref(),
            Some(expected)
        );
        assert!(normalize_database_instant("not-an-instant").is_none());
    }
}
