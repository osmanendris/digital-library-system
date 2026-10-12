const pool = require('../config/db');

const History = {
  async log(user_id, resource_id, action) {
    await pool.query(
      'INSERT INTO reading_history (user_id, resource_id, action) VALUES ($1,$2,$3)',
      [user_id, resource_id, action]
    );
  },
  async findByUser(user_id) {
    const result = await pool.query(
      `SELECT h.id, h.action, h.created_at, r.id AS resource_id, r.title, r.author, r.subject, r.cover_image
       FROM reading_history h JOIN resources r ON h.resource_id = r.id
       WHERE h.user_id = $1 ORDER BY h.created_at DESC LIMIT 100`,
      [user_id]
    );
    return result.rows;
  },
  // Admin activity log: WHO viewed/downloaded WHAT, with full identity
  // (name, ID number, department, role) - not just a "most popular" count.
  async findAllByAction(action) {
    const result = await pool.query(
      `SELECT h.id, h.action, h.created_at,
              u.id AS user_id, u.full_name AS user_name, u.id_number, u.department, u.role AS user_role,
              r.id AS resource_id, r.title AS resource_title, r.subject AS resource_subject
       FROM reading_history h
       JOIN users u ON h.user_id = u.id
       JOIN resources r ON h.resource_id = r.id
       WHERE h.action = $1
       ORDER BY h.created_at DESC
       LIMIT 500`,
      [action]
    );
    return result.rows;
  },
};

module.exports = History;
