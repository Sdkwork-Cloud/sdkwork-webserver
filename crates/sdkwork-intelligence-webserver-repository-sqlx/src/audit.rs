use sdkwork_intelligence_webserver_service::AuditLogWrite;
use sdkwork_webserver_contract::{
    AuditLogPage, AuditLogResponse, ListAuditLogsQuery, WebServiceError, WebServiceResult,
};
use super::{EngineRow, WebRepository};
use sqlx::Row;

use super::support::{
    decode_keyset_cursor, encode_keyset_cursor, instant_from_row, instant_write_expression,
    json_write_expression, new_uuid, next_id, now_rfc3339, pagination, store_error,
};

/// Strongly typed audit list filter value so PostgreSQL receives correctly
/// typed parameters instead of text literals.
enum AuditBindValue {
    Int(i64),
    Text(String),
}

/// Appends the typed filter clauses and values shared by offset and cursor
/// audit listing.
fn push_audit_filters(
    query: &ListAuditLogsQuery,
    push: &mut impl FnMut(&str, AuditBindValue),
) -> WebServiceResult<()> {
    if let Some(target_type) = query.target_type.as_deref() {
        let target_type = target_type.trim();
        if target_type.is_empty() || target_type.len() > 64 {
            return Err(WebServiceError::validation(
                "targetType must contain 1..64 trimmed characters",
            ));
        }
        push("target_type = $", AuditBindValue::Text(target_type.to_string()));
    }
    if let Some(action) = query.action.as_deref() {
        let action = action.trim();
        if action.is_empty() || action.len() > 128 {
            return Err(WebServiceError::validation(
                "action must contain 1..128 trimmed characters",
            ));
        }
        push("action = $", AuditBindValue::Text(action.to_string()));
    }
    if let Some(operator_id) = query.operator_id {
        push("operator_id = $", AuditBindValue::Int(operator_id));
    }
    if let Some(start_date) = query.start_date.as_deref() {
        push("created_at >= $", AuditBindValue::Text(start_date.to_string()));
    }
    if let Some(end_date) = query.end_date.as_deref() {
        push("created_at < $", AuditBindValue::Text(end_date.to_string()));
    }
    Ok(())
}

impl WebRepository {
    pub(super) async fn list_audit_logs_repo(
        &self,
        tenant_id: Option<i64>,
        query: &ListAuditLogsQuery,
    ) -> WebServiceResult<AuditLogPage> {
        // Cursor mode (keyset on (created_at, id)) is the contract for this
        // growing log table: no deep OFFSET and no full COUNT per request.
        if let Some(cursor) = query.cursor.as_deref() {
            return self
                .list_audit_logs_cursor_repo(tenant_id, query, cursor)
                .await;
        }
        let (page, page_size, offset) = pagination(query.page, query.page_size)?;

        let mut clauses: Vec<String> = Vec::new();
        let mut arguments: Vec<AuditBindValue> = Vec::new();
        let mut push_filter = |sql: &str, value: AuditBindValue| {
            clauses.push(sql.to_string());
            arguments.push(value);
        };
        if let Some(tenant_id) = tenant_id {
            push_filter("tenant_id = $", AuditBindValue::Int(tenant_id));
        }
        push_audit_filters(query, &mut push_filter)?;

        let mut filter_sql = String::from(" WHERE 1=1");
        for (index, clause) in clauses.iter().enumerate() {
            filter_sql.push_str(" AND ");
            filter_sql.push_str(clause);
            filter_sql.push_str(&(index + 1).to_string());
        }

        let count_sql = format!("SELECT COUNT(*) AS total FROM web_audit_log{filter_sql}");
        let list_sql = format!(
            "SELECT id, uuid, action, target_type, CAST(created_at AS TEXT) AS created_at
             FROM web_audit_log{filter_sql}
             ORDER BY created_at DESC, id DESC LIMIT ${} OFFSET ${}",
            clauses.len() + 1,
            clauses.len() + 2
        );

        let mut count_query = sqlx::query(&count_sql);
        let mut list_query = sqlx::query(&list_sql);
        for value in &arguments {
            match value {
                AuditBindValue::Int(value) => {
                    count_query = count_query.bind(*value);
                    list_query = list_query.bind(*value);
                }
                AuditBindValue::Text(value) => {
                    count_query = count_query.bind(value);
                    list_query = list_query.bind(value);
                }
            }
        }
        let page_size_bind = page_size.to_string();
        let offset_bind = offset.to_string();
        list_query = list_query.bind(&page_size_bind).bind(&offset_bind);

        let count_row = count_query
            .fetch_one(&self.pool)
            .await
            .map_err(|error| store_error("count web_audit_log", error))?;
        let total: i64 = count_row
            .try_get("total")
            .map_err(|error| store_error("map web_audit_log count", error))?;

        let rows = list_query
            .fetch_all(&self.pool)
            .await
            .map_err(|error| store_error("list web_audit_log", error))?;

        let mut items = Vec::with_capacity(rows.len());
        for row in &rows {
            items.push(map_audit_log_row(row).map_err(|error| {
                WebServiceError::Internal(format!("map web_audit_log row: {error}"))
            })?);
        }

        Ok(AuditLogPage {
            items,
            total,
            page,
            page_size,
            next_cursor: None,
            has_more: None,
        })
    }

    /// Keyset page over `(created_at DESC, id DESC)` with an opaque cursor.
    /// Fetches `page_size + 1` rows so `has_more` is exact; `total` is not
    /// computed in cursor mode (PAGINATION_SPEC §6).
    async fn list_audit_logs_cursor_repo(
        &self,
        tenant_id: Option<i64>,
        query: &ListAuditLogsQuery,
        cursor: &str,
    ) -> WebServiceResult<AuditLogPage> {
        let page_size = query.page_size;
        if !(1..=200).contains(&page_size) {
            return Err(WebServiceError::validation(
                "page_size must be between 1 and 200",
            ));
        }
        let (cursor_created_at, cursor_id) = decode_keyset_cursor(cursor)
            .ok_or_else(|| WebServiceError::validation("cursor is invalid"))?;

        let mut clauses: Vec<String> = Vec::new();
        let mut arguments: Vec<AuditBindValue> = Vec::new();
        let mut push_filter = |sql: &str, value: AuditBindValue| {
            clauses.push(sql.to_string());
            arguments.push(value);
        };
        if let Some(tenant_id) = tenant_id {
            push_filter("tenant_id = $", AuditBindValue::Int(tenant_id));
        }
        push_audit_filters(query, &mut push_filter)?;
        clauses.push("(created_at, id) < ($".to_string());
        arguments.push(AuditBindValue::Text(cursor_created_at));
        arguments.push(AuditBindValue::Int(cursor_id));

        let mut filter_sql = String::from(" WHERE 1=1");
        for (index, clause) in clauses.iter().enumerate() {
            filter_sql.push_str(" AND ");
            if clause.ends_with("($") {
                filter_sql.push_str(&(index + 1).to_string());
                filter_sql.push_str(", $");
                filter_sql.push_str(&(index + 2).to_string());
                filter_sql.push(')');
            } else {
                filter_sql.push_str(clause);
                filter_sql.push_str(&(index + 1).to_string());
            }
        }

        let list_sql = format!(
            "SELECT id, uuid, action, target_type, CAST(created_at AS TEXT) AS created_at
             FROM web_audit_log{filter_sql}
             ORDER BY created_at DESC, id DESC LIMIT ${}",
            clauses.len() + 1
        );
        let mut list_query = sqlx::query(&list_sql);
        for value in &arguments {
            match value {
                AuditBindValue::Int(value) => {
                    list_query = list_query.bind(*value);
                }
                AuditBindValue::Text(value) => {
                    list_query = list_query.bind(value);
                }
            }
        }
        let fetch_size = i64::from(page_size) + 1;
        let fetch_size_bind = fetch_size.to_string();
        list_query = list_query.bind(&fetch_size_bind);

        let rows = list_query
            .fetch_all(&self.pool)
            .await
            .map_err(|error| store_error("list web_audit_log cursor", error))?;
        let has_more = rows.len() > page_size as usize;
        let page_rows = rows.into_iter().take(page_size as usize).collect::<Vec<_>>();

        let mut items = Vec::with_capacity(page_rows.len());
        for row in &page_rows {
            items.push(map_audit_log_row(row).map_err(|error| {
                WebServiceError::Internal(format!("map web_audit_log row: {error}"))
            })?);
        }
        let next_cursor = has_more
            .then(|| {
                let last = page_rows.last().expect("non-empty page when has_more");
                let created_at: String = last
                    .try_get("created_at")
                    .map_err(|error| store_error("map web_audit_log cursor instant", error))?;
                let id: i64 = last
                    .try_get("id")
                    .map_err(|error| store_error("map web_audit_log cursor id", error))?;
                Ok::<_, WebServiceError>(encode_keyset_cursor(&created_at, id))
            })
            .transpose()?;

        Ok(AuditLogPage {
            items,
            total: 0,
            page: 0,
            page_size,
            next_cursor,
            has_more: Some(has_more),
        })
    }

    pub(super) async fn insert_audit_log_repo(
        &self,
        entry: AuditLogWrite<'_>,
    ) -> WebServiceResult<()> {
        let id = next_id(self.id_generator())?;
        let uuid = new_uuid();
        let now = now_rfc3339();
        let engine = self.database_engine().await?;
        let now_expression = instant_write_expression(engine, "$13");
        let metadata_expression = json_write_expression(engine, "$12");
        let insert_sql = format!(
            "INSERT INTO web_audit_log (
                id, uuid, tenant_id, organization_id, operator_id, operator_type, action,
                target_type, target_id, target_uuid, request_id, metadata, created_at
             ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                {metadata_expression}, {now_expression}
             )"
        );

        sqlx::query(&insert_sql)
            .bind(id)
            .bind(&uuid)
            .bind(entry.tenant_id)
            .bind(entry.organization_id)
            .bind(entry.operator_id)
            .bind(entry.operator_type)
            .bind(entry.action)
            .bind(entry.target_type)
            .bind(entry.target_id)
            .bind(entry.target_uuid)
            .bind(entry.request_id)
            .bind(entry.metadata_json)
            .bind(&now)
            .execute(&self.pool)
            .await
            .map_err(|error| store_error("insert web_audit_log", error))?;

        Ok(())
    }
}

fn map_audit_log_row(row: &EngineRow) -> Result<AuditLogResponse, sqlx::Error> {
    Ok(AuditLogResponse {
        id: row.try_get("uuid")?,
        action: row.try_get("action")?,
        resource: row.try_get("target_type")?,
        created_at: instant_from_row(row, "created_at")?,
    })
}
