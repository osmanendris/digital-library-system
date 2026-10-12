// Recovery helper: if you forgot which email is currently attached to your
// Admin account (e.g. you changed it a while ago and can't remember to
// what), this lists every Admin account directly from the database so you
// can identify the right one, then pass that email to resetAdminPassword.js.
//
// Usage:
//   cd backend
//   node src/scripts/listAdmins.js
const pool = require('../config/db');
require('dotenv').config();

async function run() {
  const result = await pool.query(
    `SELECT id, full_name, email, is_active, created_at, updated_at
     FROM users WHERE role = 'admin' ORDER BY id ASC`
  );

  if (result.rows.length === 0) {
    console.log('No admin accounts found. Run "npm run seed:admin" to create the first one.');
    process.exit(0);
  }

  console.log(`Found ${result.rows.length} admin account(s):\n`);
  result.rows.forEach((u) => {
    console.log(`  ID: ${u.id}`);
    console.log(`  Name: ${u.full_name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Active: ${u.is_active}`);
    console.log(`  Last updated: ${u.updated_at}`);
    console.log('  ---');
  });
  console.log('\nUse the email shown above with: node src/scripts/resetAdminPassword.js <email> <new-password>');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to list admin accounts:', err);
  process.exit(1);
});
