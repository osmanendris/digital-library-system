const pool = require('../config/db');

const CategoryRequest = {
  async create(requested_by, name, description) {
    const result = await pool.query(
      `INSERT INTO category_requests (requested_by, name, description) VALUES ($1,$2,$3) RETURNING *`,
      [requested_by, name, description]
    );
    return result.rows[0];
  },
  async findAll() {
    const result = await pool.query(
      `SELECT cr.*, u.full_name AS requester_name, u.department FROM category_requests cr
       JOIN users u ON cr.requested_by = u.id ORDER BY cr.created_at DESC`
    );
    return result.rows;
  },
  async findPending() {
    const result = await pool.query(
      `SELECT cr.*, u.full_name AS requester_name, u.department FROM category_requests cr
       JOIN users u ON cr.requested_by = u.id WHERE cr.status = 'pending' ORDER BY cr.created_at ASC`
    );
    return result.rows;
  },
  async updateStatus(id, status, reviewed_by) {
    const result = await pool.query(
      'UPDATE category_requests SET status = $1, reviewed_by = $2 WHERE id = $3 RETURNING *',
      [status, reviewed_by, id]
    );
    return result.rows[0];
  },
};

module.exports = CategoryRequest;
