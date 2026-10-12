const pool = require('../config/db');

// Q1: departments are now a managed list (like categories), picked from a
// dropdown on the Department Head (Faculty) creation form instead of being
// free-typed.
//
// Q4: every department also carries a "Department ID" (default_id) shown
// to the Admin Librarian - it starts at 001 and increments by 1 for every
// department created after it, and can never be edited. Rather than a
// separate mutable column (which would need extra code to protect from
// edits), it's simply `id` - the existing serial primary key - formatted
// with zero-padding. A primary key is already guaranteed sequential and
// already can't be changed once assigned, so this gets all of Q4's
// "constant means uneditable" requirement for free.
const DEFAULT_ID_EXPR = `LPAD(id::text, 3, '0')`;

const Department = {
  async findAll() {
    const result = await pool.query(
      `SELECT *, ${DEFAULT_ID_EXPR} AS default_id FROM departments ORDER BY name ASC`
    );
    return result.rows;
  },
  async findById(id) {
    const result = await pool.query(
      `SELECT *, ${DEFAULT_ID_EXPR} AS default_id FROM departments WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },
  async create(name) {
    const result = await pool.query(
      `INSERT INTO departments (name) VALUES ($1) RETURNING *, ${DEFAULT_ID_EXPR} AS default_id`,
      [name]
    );
    return result.rows[0];
  },
  async update(id, name) {
    const result = await pool.query(
      `UPDATE departments SET name = COALESCE($1, name) WHERE id = $2 RETURNING *, ${DEFAULT_ID_EXPR} AS default_id`,
      [name, id]
    );
    return result.rows[0];
  },
  async remove(id) {
    await pool.query('DELETE FROM departments WHERE id = $1', [id]);
  },
};

module.exports = Department;
