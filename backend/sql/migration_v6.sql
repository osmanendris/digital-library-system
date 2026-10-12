-- ============================================================
-- Migration v6 - run against an EXISTING database to add
-- per-resource role-based access restriction.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v6.sql
--
-- allowed_roles is NULL by default, meaning "all logged-in roles can access
-- it" (same behavior as before this migration - fully backward compatible).
-- An uploader can optionally restrict a resource to specific roles only
-- (e.g. {admin,faculty}), and anyone NOT in that list gets a 403 and won't
-- even see it in Browse.
-- ============================================================

ALTER TABLE resources ADD COLUMN IF NOT EXISTS allowed_roles VARCHAR(20)[];
