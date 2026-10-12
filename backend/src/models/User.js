const pool = require('../config/db');

const User = {
  async create({ full_name, email, password_hash, role, id_number = null, department = null, expected_graduation = null, created_by = null }) {
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, id_number, department, expected_graduation, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, full_name, email, role, id_number, department, expected_graduation, is_active, created_by, created_at`,
      [full_name, email, password_hash, role, id_number, department, expected_graduation, created_by]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, full_name, email, role, id_number, department, expected_graduation, graduation_override, is_active, created_by, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByRole(role) {
    const result = await pool.query(
      'SELECT id, full_name, email, role, id_number, department, expected_graduation, graduation_override, is_active, created_by, created_at FROM users WHERE role = $1 ORDER BY created_at DESC',
      [role]
    );
    return result.rows;
  },

  // e.g. all Teachers created by a specific Faculty head
  async findByRoleAndCreator(role, created_by) {
    const result = await pool.query(
      'SELECT id, full_name, email, role, id_number, department, expected_graduation, is_active, created_at FROM users WHERE role = $1 AND created_by = $2 ORDER BY created_at DESC',
      [role, created_by]
    );
    return result.rows;
  },

  // Q4: every user of a role under a given department, matched by the
  // `department` name copied onto their row at creation time - unlike
  // matching on `created_by`, this keeps working even after the Department
  // Head who created them is deleted, since the FK on created_by is
  // ON DELETE SET NULL but `department` is just a plain string that isn't
  // touched by that deletion.
  async findByRoleAndDepartment(role, department) {
    const result = await pool.query(
      'SELECT id, full_name, email, role, id_number, department, is_active, created_by, created_at FROM users WHERE role = $1 AND department = $2 ORDER BY created_at DESC',
      [role, department]
    );
    return result.rows;
  },

  async findAll() {
    const result = await pool.query(
      'SELECT id, full_name, email, role, id_number, department, expected_graduation, graduation_override, is_active, created_by, created_at FROM users ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async updateProfile(id, { full_name, email }) {
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), updated_at = NOW()
       WHERE id = $3 RETURNING id, full_name, email, role, id_number, department`,
      [full_name, email, id]
    );
    return result.rows[0];
  },

  async updatePassword(id, password_hash) {
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, id]);
  },

  // Used by Admin (Faculty/Librarian) / Faculty (own Teachers) / Librarian (own Students)
  async resetPassword(id, password_hash) {
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, id]);
  },

  // Q5 follow-up: reactivating a student whose graduation date has already
  // passed (e.g. their withdrawal application was cancelled) needs to mark
  // graduation_override so the hourly auto-deactivation job doesn't
  // immediately flip them back to inactive again. Deactivating, or
  // (re)activating a student who hasn't reached their graduation date yet,
  // doesn't touch the flag - it's only relevant for this one scenario.
  async setActive(id, is_active) {
    const result = await pool.query(
      `UPDATE users SET is_active = $1, updated_at = NOW(),
       graduation_override = CASE
         WHEN $1 = TRUE AND role = 'student' AND expected_graduation IS NOT NULL AND expected_graduation <= CURRENT_DATE
           THEN TRUE
         ELSE graduation_override
       END
       WHERE id = $2
       RETURNING id, full_name, email, role, is_active, expected_graduation, graduation_override`,
      [is_active, id]
    );
    return result.rows[0];
  },

  // Q5 follow-up: if the graduation date is pushed into the future (e.g. an
  // extension), clear graduation_override so normal auto-deactivation
  // behavior resumes when that new date eventually arrives.
  async update(id, { full_name, email, department, id_number, expected_graduation }) {
    const result = await pool.query(
      `UPDATE users SET full_name = COALESCE($1,full_name), email = COALESCE($2,email),
       department = COALESCE($3,department), id_number = COALESCE($4,id_number),
       expected_graduation = COALESCE($5,expected_graduation),
       graduation_override = CASE
         WHEN $5::date IS NOT NULL AND $5::date > CURRENT_DATE THEN FALSE
         ELSE graduation_override
       END,
       updated_at = NOW() WHERE id = $6
       RETURNING id, full_name, email, role, id_number, department, expected_graduation, is_active, graduation_override`,
      [full_name, email, department, id_number, expected_graduation, id]
    );
    return result.rows[0];
  },

  // Q5: called on a schedule (see server.js) - any active student whose
  // expected_graduation date has passed gets automatically deactivated,
  // unless a human already manually reactivated them for that same past
  // date (graduation_override = TRUE), in which case that decision sticks.
  async deactivateExpiredGraduates() {
    const result = await pool.query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW()
       WHERE role = 'student' AND is_active = TRUE AND graduation_override = FALSE
         AND expected_graduation IS NOT NULL AND expected_graduation <= CURRENT_DATE
       RETURNING id, full_name, id_number, expected_graduation`
    );
    return result.rows;
  },

  async remove(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },
};

module.exports = User;
