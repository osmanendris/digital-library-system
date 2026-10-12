const pool = require('../config/db');

const Bookmark = {
  async add(user_id, resource_id) {
    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, resource_id) VALUES ($1,$2)
       ON CONFLICT (user_id, resource_id) DO NOTHING RETURNING *`,
      [user_id, resource_id]
    );
    return result.rows[0];
  },
  async remove(user_id, resource_id) {
    await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND resource_id = $2', [user_id, resource_id]);
  },
  async findByUser(user_id) {
    const result = await pool.query(
      `SELECT b.id AS bookmark_id, r.* FROM bookmarks b
       JOIN resources r ON b.resource_id = r.id
       WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [user_id]
    );
    return result.rows;
  },
};

module.exports = Bookmark;
