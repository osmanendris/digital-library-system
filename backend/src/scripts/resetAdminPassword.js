// Recovery tool for when an Admin forgets their password. Admin sits at the
// top of the role hierarchy with no one above them to reset it through the
// website - so this has to be run directly on the server, by whoever has
// access to the machine and database (the same trust level as installing
// the software in the first place).
//
// Usage:
//   cd backend
//   node src/scripts/resetAdminPassword.js admin@kptc.edu.et NewPassword123
//
// (Replace the email with the actual Admin account email, and choose your
// own new password - it does NOT need to match anything in .env.)
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
require('dotenv').config();

async function run() {
  const [, , email, newPassword] = process.argv;

  if (!email || !newPassword) {
    console.log('Usage: node src/scripts/resetAdminPassword.js <admin-email> <new-password>');
    process.exit(1);
  }

  const result = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    console.log(`No account found with email: ${email}`);
    process.exit(1);
  }
  if (user.role !== 'admin') {
    console.log(`That account exists but is a "${user.role}", not an admin. Refusing to reset it here - use the appropriate person to reset it instead (Admin resets Faculty/Librarian, Faculty resets Teacher, Librarian resets Student).`);
    process.exit(1);
  }

  const password_hash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [password_hash, user.id]);

  console.log(`✅ Password reset successfully for admin account: ${email}`);
  console.log('   You can now log in with the new password.');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to reset password:', err);
  process.exit(1);
});
