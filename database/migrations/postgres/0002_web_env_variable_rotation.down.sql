-- sdkwork:migration
-- version: 0002
-- engine: postgres
-- module: web
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

DROP INDEX IF EXISTS uk_web_env_variable_active_key;
ALTER TABLE web_env_variable
    ADD CONSTRAINT uk_web_env_variable_key UNIQUE (site_id, environment, key);
