-- ============================================================
-- Migration v3 - run this against an EXISTING database to add
-- new columns without losing your current data.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v3.sql
-- ============================================================

ALTER TABLE resources ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0;

-- (department already exists on users from v2 - this is just a safety net
-- in case an even older schema is being upgraded directly to v3)
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(150);
