const pool = require('../config/db');

const Category = {
  async findAll() {
    const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
    return result.rows;
  },
  async findById(id) {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    return result.rows[0];
  },
  async create(name, description) {
    const result = await pool.query(
      'INSERT INTO categories (name, description) VALUES ($1,$2) RETURNING *',
      [name, description]
    );
    return result.rows[0];
  },
  async update(id, name, description) {
    const result = await pool.query(
      'UPDATE categories SET name = COALESCE($1,name), description = COALESCE($2,description) WHERE id = $3 RETURNING *',
      [name, description, id]
    );
    return result.rows[0];
  },
  async remove(id) {
    await pool.query('DELETE FROM categories WHERE id = $1', [id]);
  },
};

module.exports = Category;
