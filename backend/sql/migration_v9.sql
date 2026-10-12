-- ============================================================
-- Migration v9 - run against an EXISTING database.
-- Q2: renames the "faculty" role to "department_head" everywhere,
-- including existing rows. (Internal columns like faculty_approved_by/at
-- and the 'faculty_approved' resource status keep their names - purely
-- internal identifiers, not user-facing, renaming them touches dozens of
-- queries for zero visible benefit.)
-- Usage: psql -U postgres -d digital_library -f sql/migration_v9.sql
-- ============================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users SET role = 'department_head' WHERE role = 'faculty';

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','department_head','teacher','librarian','admin_librarian','staff','student'));

DROP INDEX IF EXISTS idx_unique_faculty_department;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_department_head_department
  ON users(department) WHERE role = 'department_head';
