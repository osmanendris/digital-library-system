-- ============================================================
-- Migration v13 - run against an EXISTING database.
-- Q3 (this session): announcements can now include an image and/or a
-- video (either an uploaded file or an external link like YouTube), and
-- every role gets a dedicated "Announcements" page in their own dashboard
-- (not just a one-line banner on the public Home page) to read the full
-- content.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v13.sql
-- ============================================================

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_filename VARCHAR(255);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS video_filename VARCHAR(255);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS video_url VARCHAR(500); -- external link (e.g. YouTube), alternative to an uploaded video file
