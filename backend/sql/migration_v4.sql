-- ============================================================
-- Migration v4 - run this against an EXISTING database to add
-- the "one Faculty per department" rule without losing data.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v4.sql
--
-- NOTE: if you already have two or more Faculty accounts sharing the same
-- department, this will FAIL until you fix that duplication first (change
-- one of their departments, or remove the duplicate account).
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_faculty_department
  ON users(department) WHERE role = 'faculty';
