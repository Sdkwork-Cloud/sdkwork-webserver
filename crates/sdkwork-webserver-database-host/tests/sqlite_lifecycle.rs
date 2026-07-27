use sdkwork_database_config::{DatabaseConfig, DatabaseEngine};
use sdkwork_database_sqlx::create_pool_from_config;

#[tokio::test]
async fn sqlite_repository_fixture_initializes_expected_schema() {
    let pool = create_pool_from_config(DatabaseConfig {
        engine: DatabaseEngine::Sqlite,
        url: "sqlite::memory:".to_owned(),
        max_connections: 1,
        ..Default::default()
    })
    .await
    .expect("create SQLite fixture pool");
    let sqlite = pool.as_sqlite().expect("SQLite fixture pool");

    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(sqlite)
        .await
        .expect("enable SQLite foreign keys");
    sqlx::raw_sql(include_str!(
        "../../../tests/fixtures/database/sqlite/0001_web_baseline.sql"
    ))
    .execute(sqlite)
    .await
    .expect("initialize SQLite repository fixture");

    let table_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_schema WHERE type = 'table' AND name LIKE 'web_%'",
    )
    .fetch_one(sqlite)
    .await
    .expect("count SQLite fixture tables");
    assert!(table_count >= 12, "expected Web repository fixture tables");

    let application_type_columns: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('web_site') WHERE name = 'application_type'",
    )
    .fetch_one(sqlite)
    .await
    .expect("inspect application_type fixture column");
    assert_eq!(application_type_columns, 1);

    pool.close().await;
}
