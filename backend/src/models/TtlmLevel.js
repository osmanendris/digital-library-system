const pool = require('../config/db');

// Q8: TTLM levels are a managed list (like departments/categories), so
// the upload form's "Level" dropdown is populated from here.
const TtlmLevel = {
  async findAll() {
    const result = await pool.query('SELECT * FROM ttlm_levels ORDER BY name ASC');
    return result.rows;
  },
  async create(name) {
    const result = await pool.query(
      'INSERT INTO ttlm_levels (name) VALUES ($1) RETURNING *',
      [name]
    );
    return result.rows[0];
  },
  async update(id, name) {
    const result = await pool.query(
      'UPDATE ttlm_levels SET name = COALESCE($1, name) WHERE id = $2 RETURNING *',
      [name, id]
    );
    return result.rows[0];
  },
  async remove(id) {
    await pool.query('DELETE FROM ttlm_levels WHERE id = $1', [id]);
  },
};

module.exports = TtlmLevel;
