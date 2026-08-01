-- Migration: 0002_web_env_variable_rotation
-- Description: Active-only environment variable key uniqueness so deactivated
--   variables release their key for rotation, plus update/delete lifecycle.
-- Author: SDKWork Web Server
-- Date: 2026-08-01

ALTER TABLE web_env_variable
    DROP CONSTRAINT IF EXISTS uk_web_env_variable_key;
CREATE UNIQUE INDEX uk_web_env_variable_active_key
    ON web_env_variable (site_id, environment, key)
    WHERE status = 1;
