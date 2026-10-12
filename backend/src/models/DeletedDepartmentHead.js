const pool = require('../config/db');

// Q4: snapshot of a Department Head's info, taken the moment their account
// is deleted, keyed to the department (by ID, since a department's NAME
// could theoretically change later via "Manage Departments" while this
// history should still line up with the right department).
const DeletedDepartmentHead = {
  async archive({ department_id, department_name, full_name, email, id_number, deleted_by }) {
    const result = await pool.query(
      `INSERT INTO deleted_department_heads
         (department_id, department_name, full_name, email, id_number, deleted_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [department_id, department_name, full_name, email, id_number, deleted_by]
    );
    return result.rows[0];
  },

  // Every former head this department has ever had, most recently deleted first.
  async findByDepartment(department_id) {
    const result = await pool.query(
      `SELECT * FROM deleted_department_heads WHERE department_id = $1 ORDER BY deleted_at DESC`,
      [department_id]
    );
    return result.rows;
  },
};

module.exports = DeletedDepartmentHead;
