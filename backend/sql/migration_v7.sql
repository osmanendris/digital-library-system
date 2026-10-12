-- ============================================================
-- Migration v7 - run against an EXISTING database to add:
--   - Two new roles: 'admin_librarian' and 'staff'
--   - Renames the OLD 'librarian' role to 'admin_librarian'
--     (Q1: "Librarian" becomes "Admin Librarian" and inherits
--     Manage Faculty / All Teachers / All Students / All Resources /
--     Activity Log from the System Administrator)
--   - Re-introduces 'librarian' as a NEW, lower-privilege role created
--     by the Admin Librarian (Q2), with faculty-like features except
--     "Manage Teachers" is replaced by "Manage Students"
--   - Adds a two-stage resource approval pipeline:
--       pending -> (teacher upload) -> faculty_approved -> approved
--       pending -> (everyone else)  -> approved
--     Every resource's FINAL approval is always given by an
--     Admin Librarian (Q3).
-- Usage: psql -U postgres -d digital_library -f sql/migration_v7.sql
-- ============================================================

-- Step 1: rename existing 'librarian' accounts to 'admin_librarian' BEFORE
-- changing the CHECK constraint, since the old constraint doesn't allow
-- 'admin_librarian' yet.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','faculty','teacher','librarian','admin_librarian','staff','student'));

UPDATE users SET role = 'admin_librarian' WHERE role = 'librarian';

-- Step 2: resource approval pipeline gets a new intermediate status plus a
-- second approver column (the Faculty's stage-1 approval of a teacher's
-- upload). The existing `approved_by` column is now ALWAYS the Admin
-- Librarian who gave the FINAL approval.
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_status_check;
ALTER TABLE resources ADD CONSTRAINT resources_status_check
  CHECK (status IN ('pending','faculty_approved','approved','rejected'));

ALTER TABLE resources ADD COLUMN IF NOT EXISTS faculty_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS faculty_approved_at TIMESTAMP;

COMMENT ON COLUMN resources.approved_by IS 'The Admin Librarian who gave FINAL approval.';
COMMENT ON COLUMN resources.faculty_approved_by IS 'The Faculty head who gave stage-1 approval (teacher uploads only).';
