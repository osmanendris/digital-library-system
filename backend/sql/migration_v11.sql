-- ============================================================
-- Migration v11 - run against an EXISTING database.
-- Q5: students get an "Expected Graduation Date" (a full date - year,
-- month, day) at registration. Once that date passes, the system
-- automatically deactivates the student (see the scheduled job in
-- server.js / User.deactivateExpiredGraduates()) instead of requiring an
-- Admin/Librarian to remember to do it manually.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v11.sql
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS expected_graduation DATE;
