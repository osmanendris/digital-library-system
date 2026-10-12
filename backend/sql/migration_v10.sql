-- ============================================================
-- Migration v10 - run against an EXISTING database.
-- Q4 (Manage Departments):
--   1) Departments get a human-facing "Department ID" that starts at 001
--      and increments by 1 - this is just the existing serial primary key
--      formatted with zero-padding, so it's automatically sequential and
--      automatically immutable (a primary key can't be edited). No new
--      column needed for that part; see departmentController.js.
--   2) When a Department Head account is deleted, their teachers keep
--      their `department` (a plain name string copied at creation time),
--      so they're never orphaned. But the deleted head's OWN info (name,
--      email, Staff ID) is lost forever on a hard delete - this table
--      archives it first so that when a new Department Head is later
--      created for the SAME department, the Admin Librarian can see who
--      held the role before and the full list of teachers that head
--      created.
-- Usage: psql -U postgres -d digital_library -f sql/migration_v10.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS deleted_department_heads (
    id SERIAL PRIMARY KEY,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    department_name VARCHAR(150) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    id_number VARCHAR(50),
    deleted_at TIMESTAMP DEFAULT NOW(),
    deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deleted_department_heads_department
  ON deleted_department_heads(department_id);
