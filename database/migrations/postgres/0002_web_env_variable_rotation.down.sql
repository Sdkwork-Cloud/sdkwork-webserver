-- Rollback: 0002_web_env_variable_rotation

DROP INDEX IF EXISTS uk_web_env_variable_active_key;
ALTER TABLE web_env_variable
    ADD CONSTRAINT uk_web_env_variable_key UNIQUE (site_id, environment, key);
