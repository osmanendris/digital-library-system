-- ============================================================
-- Migration v8 - run against an EXISTING database to add:
--   Q1 - a real "departments" list (like categories), so Department
--        Head (Faculty)/Teacher/Student registration picks a department
--        from a dropdown instead of free-typing it.
--   Q7 - self-service "Forgot Password" via emailed OTP.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v8.sql
-- (New installs: schema.sql already has everything, no migration needed.)
-- ============================================================

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed from whatever department names are already in use, so existing
-- data keeps working with the new dropdown immediately.
INSERT INTO departments (name)
SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department <> ''
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);

-- Q8: TTLM levels (like Level 1, Level 2, ...), a managed list the same
-- way departments/categories are, plus the two columns on resources that
-- record whether a resource has a TTLM part and which level it's at.
CREATE TABLE IF NOT EXISTS ttlm_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE resources ADD COLUMN IF NOT EXISTS is_ttlm BOOLEAN DEFAULT FALSE;
ALTER TABLE resources ADD COLUMN IF NOT EXISTS ttlm_level_id INTEGER REFERENCES ttlm_levels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_resources_ttlm_level ON resources(ttlm_level_id);
