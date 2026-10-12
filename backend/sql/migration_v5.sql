-- ============================================================
-- Migration v5 - run against an EXISTING database to add:
--   - id_number (student ID / staff ID) for student/faculty/librarian
--   - resource_requests.subject (students must specify a subject when
--     requesting a resource, same as uploaders do)
-- Usage: psql -U postgres -d digital_library -f sql/migration_v5.sql
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR(50);
-- Add uniqueness separately so this migration doesn't fail if the column
-- already has non-unique NULL values (NULLs never conflict with each other).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_number_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_id_number_key UNIQUE (id_number);
  END IF;
END $$;

ALTER TABLE resource_requests ADD COLUMN IF NOT EXISTS subject VARCHAR(150);
