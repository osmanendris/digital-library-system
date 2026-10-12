const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Confirms the CURRENTLY LOGGED IN user's password (not the target account's)
// before allowing a sensitive edit/delete action to proceed.
async function verifyCurrentUserPassword(userId, suppliedPassword) {
  if (!suppliedPassword) return false;
  const basicUser = await User.findById(userId);
  if (!basicUser) return false;
  const fullUser = await User.findByEmail(basicUser.email);
  if (!fullUser) return false;
  return bcrypt.compare(suppliedPassword, fullUser.password_hash);
}

module.exports = { verifyCurrentUserPassword };
