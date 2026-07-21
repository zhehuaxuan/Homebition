-- 002_add_api_manager_type.sql
ALTER TABLE api_manager
  ADD COLUMN type VARCHAR(20) NOT NULL DEFAULT 'external'
    COMMENT 'external: 外部URL, internal: 内部AI接口';
