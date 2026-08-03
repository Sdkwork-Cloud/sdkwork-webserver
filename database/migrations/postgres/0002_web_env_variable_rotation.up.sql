-- sdkwork:migration
-- version: 0002
-- engine: postgres
-- module: web
-- description: Active-only environment variable key uniqueness so deactivated
--   variables release their key for rotation.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: access-exclusive
-- lock_timeout: 30s
-- statement_timeout: 120s

ALTER TABLE web_env_variable
    DROP CONSTRAINT IF EXISTS uk_web_env_variable_key;
CREATE UNIQUE INDEX IF NOT EXISTS uk_web_env_variable_active_key
    ON web_env_variable (site_id, environment, key)
    WHERE status = 1;
