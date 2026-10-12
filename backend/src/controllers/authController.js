const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PasswordReset = require('../models/PasswordReset');
const { sendOtpEmail } = require('../utils/sendCredentialsEmail');
const { passwordStrengthError } = require('../utils/validateText');
require('dotenv').config();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, full_name: user.full_name, department: user.department },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// NOTE: There is NO public self-registration in this system.
// Every account is created by someone above it in the hierarchy:
//   Admin     -> Faculty, Librarian   (see adminController)
//   Department Head -> Teacher       (see departmentHeadController)
//   Librarian -> Student              (see librarianController)
// This login endpoint is the only public auth route besides that hierarchy.

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!user.is_active) return res.status(403).json({ message: 'Your account has been deactivated. Contact the administrator.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: 'Invalid email or password.' });

    const token = signToken(user);
    delete user.password_hash;
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed.' });
  }
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
};

// ANY logged-in role (student, teacher, faculty, librarian, admin) can update their own profile,
// but must confirm their current password first (protects against a hijacked/left-open session).
//
// IMPORTANT: always looks the account up by req.user.ID (permanent, never
// changes), never by req.user.email. The JWT's embedded email/full_name are
// a snapshot from login time - if the person changes their email here, the
// OLD token they're still holding would have a stale email, and looking
// that stale email up would find nothing and crash any *subsequent* action
// (this was the actual cause of "change email works, then change password
// stops working" - changePassword had the same bug, fixed below too).
// We also reissue a fresh token with the updated info so the token and the
// database never drift apart again for the rest of the session.
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, email, current_password } = req.body;
    if (full_name !== undefined) {
      const { textFieldError } = require('../utils/validateText');
      const e = textFieldError(full_name, 'Full name');
      if (e) return res.status(400).json({ message: e });
    }
    const fullUser = await User.findByEmail((await User.findById(req.user.id))?.email || '');
    if (!fullUser) return res.status(404).json({ message: 'Account not found.' });

    const match = await bcrypt.compare(current_password || '', fullUser.password_hash);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

    const user = await User.updateProfile(req.user.id, { full_name, email });
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That email is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not update profile.' });
  }
};

// ANY logged-in role can change their own password. Looks the account up by
// ID (see the long comment on updateProfile above for why this matters).
exports.changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const basicUser = await User.findById(req.user.id);
    if (!basicUser) return res.status(404).json({ message: 'Account not found.' });

    const fullUser = await User.findByEmail(basicUser.email);
    const match = await bcrypt.compare(current_password, fullUser.password_hash);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect.' });

    const pwErr = passwordStrengthError(new_password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const password_hash = await bcrypt.hash(new_password, 10);
    await User.updatePassword(req.user.id, password_hash);
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not change password.' });
  }
};

// ============================================================
// Q7: self-service "Forgot Password" via emailed OTP. Replaces the
// admin-side "Reset Password" button - a person who forgets their
// password now resets it themselves, without anyone else's involvement.
// ============================================================

// Step 1: request a code. Always responds the same way whether or not the
// email exists, so this endpoint can't be used to find out who has an
// account (standard practice for forgot-password flows).
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });
    const genericResponse = { message: 'If that email has an account, a reset code has been sent to it.' };

    const user = await User.findByEmail(email);
    if (!user || !user.is_active) return res.json(genericResponse);

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const otp_hash = await bcrypt.hash(otp, 10);
    const expires_at = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await PasswordReset.create(user.id, otp_hash, expires_at);

    // Fire-and-forget, same reasoning as account-creation emails (Q5) -
    // don't make the person wait on an SMTP round-trip.
    sendOtpEmail({ to: user.email, full_name: user.full_name, otp }).catch(() => {});

    res.json(genericResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not process request.' });
  }
};

// Step 2: verify the code and set a new password.
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ message: 'Email, code, and new password are all required.' });
    }
    const user = await User.findByEmail(email);
    if (!user) return res.status(400).json({ message: 'Invalid or expired code.' });

    const record = await PasswordReset.findValid(user.id);
    if (!record) return res.status(400).json({ message: 'Invalid or expired code. Request a new one.' });

    const match = await bcrypt.compare(otp, record.otp_hash);
    if (!match) return res.status(400).json({ message: 'Invalid or expired code.' });

    await PasswordReset.markUsed(record.id);
    const pwErr = passwordStrengthError(new_password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const password_hash = await bcrypt.hash(new_password, 10);
    await User.updatePassword(user.id, password_hash);

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not reset password.' });
  }
};
