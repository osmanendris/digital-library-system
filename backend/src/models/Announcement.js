const pool = require('../config/db');

const Announcement = {
  // Q3: image_filename/video_filename are the uploaded file's stored name
  // (served statically, same pattern as resource cover images);
  // video_url is an alternative external link (e.g. YouTube) instead of
  // an uploaded video file.
  async create(title, message, posted_by, { image_filename = null, video_filename = null, video_url = null } = {}) {
    const result = await pool.query(
      `INSERT INTO announcements (title, message, posted_by, image_filename, video_filename, video_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title, message, posted_by, image_filename, video_filename, video_url]
    );
    return result.rows[0];
  },
  async findActive() {
    const result = await pool.query(
      `SELECT a.*, u.full_name AS posted_by_name FROM announcements a
       LEFT JOIN users u ON a.posted_by = u.id
       WHERE a.is_active = TRUE ORDER BY a.created_at DESC LIMIT 20`
    );
    return result.rows;
  },
  async findAll() {
    const result = await pool.query(
      `SELECT a.*, u.full_name AS posted_by_name FROM announcements a
       LEFT JOIN users u ON a.posted_by = u.id
       ORDER BY a.created_at DESC`
    );
    return result.rows;
  },
  async findById(id) {
    const result = await pool.query('SELECT * FROM announcements WHERE id = $1', [id]);
    return result.rows[0];
  },
  async setActive(id, is_active) {
    const result = await pool.query(
      'UPDATE announcements SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );
    return result.rows[0];
  },
  async update(id, title, message, { image_filename, video_filename, video_url, clearImage, clearVideo } = {}) {
    const result = await pool.query(
      `UPDATE announcements SET
         title = COALESCE($1,title),
         message = COALESCE($2,message),
         image_filename = CASE WHEN $3 THEN NULL WHEN $4::varchar IS NOT NULL THEN $4 ELSE image_filename END,
         video_filename = CASE WHEN $5 THEN NULL WHEN $6::varchar IS NOT NULL THEN $6 ELSE video_filename END,
         video_url = CASE WHEN $5 THEN NULL WHEN $7::varchar IS NOT NULL THEN $7 ELSE video_url END
       WHERE id = $8 RETURNING *`,
      [title, message, !!clearImage, image_filename || null, !!clearVideo, video_filename || null, video_url || null, id]
    );
    return result.rows[0];
  },
  async remove(id) {
    await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
  },
};

module.exports = Announcement;
