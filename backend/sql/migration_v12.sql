-- ============================================================
-- Migration v12 - run against an EXISTING database.
-- Follow-up to Q5: a student whose expected_graduation date has passed
-- gets auto-deactivated by the hourly job (see server.js). But if that
-- student turns out to have filed a withdrawal-cancellation / still needs
-- access, the Admin Librarian or Librarian who created them should be able
-- to flip them back to Active - and have it STAY that way, instead of the
-- same hourly job immediately deactivating them again because their
-- graduation date is still in the past.
--
-- graduation_override = TRUE means "a human deliberately reactivated this
-- student after their graduation date had already passed - leave them
-- alone." It's cleared automatically if the graduation date is later moved
-- into the future again (see User.update), so the normal auto-deactivation
-- behavior resumes once that new date arrives.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v12.sql
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_override BOOLEAN DEFAULT FALSE;

-- ------------------------------------------------------------
-- Unrelated bug fix bundled in here since it's the latest migration file:
-- the ORIGINAL seed data for 'allowed_file_types' (in schema.sql) was
-- missing "doc" and "docx" - despite the comment right next to it in
-- upload.js listing docx as a supported example - which silently rejects
-- every Word document upload on a fresh install. If your existing database
-- already has this row and it's missing docx, this adds it back without
-- touching any other file types you may have already configured.
-- ------------------------------------------------------------
UPDATE settings
SET value = value || ',doc,docx'
WHERE key = 'allowed_file_types'
  AND value NOT LIKE '%docx%';
