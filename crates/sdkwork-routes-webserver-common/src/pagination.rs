use axum::{
    extract::Request,
    middleware::Next,
    response::{IntoResponse, Response},
};

use crate::WebApiError;
use sdkwork_utils_rust::SdkWorkResultCode;

const MAXIMUM_PAGE_SIZE: i64 = 200;

/// Reject malformed or non-canonical pagination query parameters before handlers run.
pub async fn validate_pagination_query(request: Request, next: Next) -> Response {
    if let Err(detail) = validate_query(request.uri().query()) {
        return WebApiError::new(SdkWorkResultCode::ValidationError, detail).into_response();
    }
    next.run(request).await
}

fn validate_query(query: Option<&str>) -> Result<(), String> {
    let Some(query) = query else {
        return Ok(());
    };
    let mut page: Option<&str> = None;
    let mut page_size: Option<&str> = None;
    let mut cursor = false;
    for pair in query.split('&').filter(|pair| !pair.is_empty()) {
        let (key, value) = pair.split_once('=').unwrap_or((pair, ""));
        match key {
            "page" => {
                if page.replace(value).is_some() {
                    return Err("page must be specified at most once".to_string());
                }
                let parsed = value.parse::<i64>().map_err(|_| {
                    "page must be an integer greater than or equal to 1".to_string()
                })?;
                if parsed < 1 {
                    return Err("page must be greater than or equal to 1".to_string());
                }
            }
            "page_size" => {
                if page_size.replace(value).is_some() {
                    return Err("page_size must be specified at most once".to_string());
                }
                let parsed = value
                    .parse::<i64>()
                    .map_err(|_| "page_size must be an integer between 1 and 200".to_string())?;
                if !(1..=MAXIMUM_PAGE_SIZE).contains(&parsed) {
                    return Err("page_size must be between 1 and 200".to_string());
                }
            }
            "cursor" => cursor = true,
            "pageSize" | "limit" | "page_no" | "pageNo" | "per_page" | "size" => {
                return Err(format!(
                    "{key} is not a supported pagination parameter; use page_size"
                ));
            }
            _ => {}
        }
    }
    if cursor && page.is_some() {
        return Err("page and cursor cannot be combined".to_string());
    }
    if cursor {
        return Err("cursor pagination is not supported by this endpoint".to_string());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::validate_query;

    #[test]
    fn accepts_canonical_values_and_rejects_aliases() {
        assert!(validate_query(Some("page=2&page_size=20")).is_ok());
        assert!(validate_query(Some("pageSize=20")).is_err());
        assert!(validate_query(Some("page_size=201")).is_err());
        assert!(validate_query(Some("page=0")).is_err());
        assert!(validate_query(Some("page=1&page=2")).is_err());
        assert!(validate_query(Some("cursor=opaque")).is_err());
    }
}
