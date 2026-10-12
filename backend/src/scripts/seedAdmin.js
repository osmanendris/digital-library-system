// Creates the very first Admin account for the system.
// Run once after setting up the database: npm run seed:admin
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
require('dotenv').config();

async function seed() {
  const name = process.env.ADMIN_NAME || 'System Administrator';
  const email = process.env.ADMIN_EMAIL || 'admin@kptc.edu.et';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    console.log(`Admin account already exists for ${email}. Skipping.`);
    process.exit(0);
  }

  const password_hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1,$2,$3,'admin')`,
    [name, email, password_hash]
  );

  console.log('✅ Admin account created:');
  console.log(`   Email:    ${email}`);
  console.log(`   Password: ${password}`);
  console.log('   Please log in and change this password immediately.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Failed to seed admin account:', err);
  process.exit(1);
});
