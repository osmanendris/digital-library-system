const pool = require('../config/db');

const ResourceRequest = {
  async create(requested_by, title, author, subject, reason) {
    const result = await pool.query(
      `INSERT INTO resource_requests (requested_by, title, author, subject, reason) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [requested_by, title, author, subject, reason]
    );
    return result.rows[0];
  },
  async findAll() {
    const result = await pool.query(
      `SELECT rr.*, u.full_name AS requester_name, u.role AS requester_role FROM resource_requests rr
       JOIN users u ON rr.requested_by = u.id ORDER BY rr.created_at DESC`
    );
    return result.rows;
  },
  async findByUser(user_id) {
    const result = await pool.query(
      'SELECT * FROM resource_requests WHERE requested_by = $1 ORDER BY created_at DESC',
      [user_id]
    );
    return result.rows;
  },
  async updateStatus(id, status) {
    const result = await pool.query(
      'UPDATE resource_requests SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return result.rows[0];
  },
};

module.exports = ResourceRequest;
