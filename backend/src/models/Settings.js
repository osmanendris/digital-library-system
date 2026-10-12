const pool = require('../config/db');

const Settings = {
  async getAll() {
    const result = await pool.query('SELECT * FROM settings ORDER BY key ASC');
    const obj = {};
    result.rows.forEach((row) => { obj[row.key] = row.value; });
    return obj;
  },
  async get(key) {
    const result = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return result.rows[0] ? result.rows[0].value : null;
  },
  async set(key, value) {
    const result = await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1,$2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW() RETURNING *`,
      [key, value]
    );
    return result.rows[0];
  },
};

module.exports = Settings;
