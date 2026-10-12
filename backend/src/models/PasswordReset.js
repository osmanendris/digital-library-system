const pool = require('../config/db');

const PasswordReset = {
  async create(user_id, otp_hash, expires_at) {
    // Invalidate any earlier unused codes for this user first, so only the
    // most recently requested OTP is ever valid.
    await pool.query('UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE', [user_id]);
    const result = await pool.query(
      'INSERT INTO password_resets (user_id, otp_hash, expires_at) VALUES ($1,$2,$3) RETURNING *',
      [user_id, otp_hash, expires_at]
    );
    return result.rows[0];
  },

  // Most recent unused, unexpired code for this user.
  async findValid(user_id) {
    const result = await pool.query(
      `SELECT * FROM password_resets WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [user_id]
    );
    return result.rows[0];
  },

  async markUsed(id) {
    await pool.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [id]);
  },
};

module.exports = PasswordReset;
