-- ============================================================
-- Digital Library System - PostgreSQL Schema (v9 - Department Head + TTLM)
-- Roles: admin, admin_librarian, department_head, teacher, librarian, staff, student
-- (guest = no account)
--
--   admin            -> creates admin_librarian
--   admin_librarian  -> creates department_head, librarian, staff, student
--   department_head  -> creates teacher
--   librarian        -> creates student (helps the admin_librarian)
-- ============================================================

-- Drops EVERY table this file creates, in FK-safe order (CASCADE handles
-- the rest) - this makes schema.sql safe to re-run from scratch on a
-- database that already has some or all of these tables, instead of
-- failing with "relation already exists" partway through.
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS resource_requests CASCADE;
DROP TABLE IF EXISTS reading_history CASCADE;
DROP TABLE IF EXISTS bookmarks CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS category_requests CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS ttlm_levels CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS deleted_department_heads CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- USERS  (hierarchy enforced in application logic, not just DB)
--   admin           -> creates admin_librarian
--   admin_librarian -> creates department_head, librarian, staff, student
--   department_head -> creates teacher (same department)
--   librarian       -> creates student (helps the admin_librarian)
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin','department_head','teacher','librarian','admin_librarian','staff','student')),
    id_number VARCHAR(50) UNIQUE,             -- student ID / staff ID (required for student/department_head/librarian)
    department VARCHAR(150),                 -- used by department_head, teacher & student
    expected_graduation DATE,                -- Q5: students only - auto-deactivated once this date passes
    graduation_override BOOLEAN DEFAULT FALSE, -- Q5 follow-up: TRUE = a human manually reactivated this student after their graduation date passed (e.g. withdrawal cancelled) - the auto-deactivation job leaves them alone until this is cleared
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- who created this account
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Q1: departments picked from a dropdown, same pattern as categories,
-- instead of being free-typed on the Department Head (Faculty) form.
-- Q4: "Department ID" shown to the user is just `id` zero-padded to 3
-- digits (001, 002, ...) computed at query time - since `id` is a serial
-- primary key it's already guaranteed sequential and can never be edited.
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Q4: archives a Department Head's info + which department they led the
-- moment their account is deleted (a hard delete of the users row would
-- otherwise erase this permanently). Lets the Admin Librarian see the full
-- history for a department - previous head(s) and the teachers each one
-- created - when assigning a NEW head to that same department later.
CREATE TABLE deleted_department_heads (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    department_name VARCHAR(150) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    id_number VARCHAR(50),
    deleted_at TIMESTAMP DEFAULT NOW(),
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX idx_deleted_department_heads_department ON deleted_department_heads(department_id);

-- Q7: self-service "Forgot Password" via emailed OTP.
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);

-- Q8: TTLM levels (Level 1, Level 2, ...), a managed list the same way
-- departments/categories are.
CREATE TABLE ttlm_levels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Faculty requests a new category; Admin approves/rejects
CREATE TABLE category_requests (
    id SERIAL PRIMARY KEY,
    requested_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150),
    subject VARCHAR(150),
    keywords TEXT,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT DEFAULT 0,               -- bytes, used to show a proper human-readable size
    file_type VARCHAR(20) NOT NULL DEFAULT 'pdf',   -- pdf, epub, ppt, video
    cover_image VARCHAR(500),
    visibility VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (visibility IN ('public','registered')),
    downloadable BOOLEAN DEFAULT FALSE,
    allowed_roles VARCHAR(20)[],              -- NULL = all logged-in roles can access; otherwise restricted to just these roles
    rejection_reason TEXT,
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- teacher, department_head, librarian, admin_librarian
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','faculty_approved','approved','rejected')),
    faculty_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- stage-1 approval, teacher uploads only
    faculty_approved_at TIMESTAMP,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,   -- ALWAYS the Admin Librarian who gave FINAL approval
    is_ttlm BOOLEAN DEFAULT FALSE,            -- Q8: does this resource have a TTLM part?
    ttlm_level_id INTEGER REFERENCES ttlm_levels(id) ON DELETE SET NULL, -- Q8: which TTLM level, if is_ttlm
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bookmarks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, resource_id)
);

CREATE TABLE reading_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL CHECK (action IN ('viewed','downloaded')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Students suggest new resources; Librarian handles these
CREATE TABLE resource_requests (
    id SERIAL PRIMARY KEY,
    requested_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(150),
    subject VARCHAR(150),
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','fulfilled','declined')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    image_filename VARCHAR(255),
    video_filename VARCHAR(255),
    video_url VARCHAR(500), -- external link (e.g. YouTube), alternative to an uploaded video file
    created_at TIMESTAMP DEFAULT NOW()
);

-- System-wide settings managed by Admin (file size limits, allowed file types, etc.)
CREATE TABLE settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX idx_resources_status ON resources(status);
CREATE INDEX idx_resources_category ON resources(category_id);
CREATE INDEX idx_resources_uploaded_by ON resources(uploaded_by);
CREATE INDEX idx_resources_ttlm_level ON resources(ttlm_level_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_by ON users(created_by);
CREATE INDEX idx_history_user ON reading_history(user_id);

-- Enforces exactly one Faculty (department head) per department - a
-- department-scoped uniqueness rule, not a blanket unique on the column
-- (Teachers also use `department` and can share one freely).
CREATE UNIQUE INDEX idx_unique_department_head_department ON users(department) WHERE role = 'department_head';

-- NOTE: The first Admin account is created by running `npm run seed:admin`
-- (see backend/src/scripts/seedAdmin.js) so the password is bcrypt-hashed
-- properly at setup time, instead of a hardcoded hash here.

-- Seed default settings
INSERT INTO settings (key, value) VALUES
('max_file_size_mb', '100'),
('allowed_file_types', 'pdf,doc,docx,epub,ppt,pptx,mp4,mov'),
('site_name', 'Kombolcha Polytechnic College Digital Library');

-- Seed sample categories
INSERT INTO categories (name, description) VALUES
('Computer Science', 'Programming, networks, software engineering'),
('Electrical Engineering', 'Circuits, electronics, power systems'),
('Mechanical Engineering', 'Automotive, manufacturing, mechanics'),
('Textile & Garment', 'Textile technology and garment production'),
('General Education', 'General courses and reference material');
