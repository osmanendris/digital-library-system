const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Category = require('../models/Category');
const CategoryRequest = require('../models/CategoryRequest');
const Settings = require('../models/Settings');
const { verifyCurrentUserPassword } = require('../utils/verifyPassword');
const { sendCredentialsEmail } = require('../utils/sendCredentialsEmail');
const { textFieldError, idFieldError, passwordStrengthError } = require('../utils/validateText');

// ============================================================
// System Administrator (Q1 hierarchy update):
//   - The ONLY account type the System Admin creates directly is the
//     Admin Librarian (formerly "Librarian").
//   - "Manage Faculty", "All Teachers", "All Students", "All Resources"
//     and "Activity Log" have all moved to the Admin Librarian dashboard
//     (see adminLibrarianController.js) and are intentionally NOT here
//     anymore.
// ============================================================

// ---------------- ADMIN LIBRARIAN ACCOUNTS ----------------
exports.createAdminLibrarian = async (req, res) => {
  try {
    const { full_name, email, password, id_number } = req.body;
    const idErr = idFieldError(id_number, 'Staff ID');
    if (idErr) return res.status(400).json({ message: idErr });
    { const e = textFieldError(full_name, 'Full name', 5); if (e) return res.status(400).json({ message: e }); }
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });
    const pwErr = passwordStrengthError(password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, email, password_hash, role: 'admin_librarian', id_number, created_by: req.user.id });
    // Q5: fire-and-forget so account creation responds instantly instead
    // of waiting on an SMTP round-trip (that wait was why "create" used
    // to hang for several seconds). Check the backend console if a
    // recipient says they never got the email.
    sendCredentialsEmail({ to: email, full_name, role: 'admin_librarian', password }).catch(() => {});
    res.status(201).json({ user, message: 'Admin Librarian account created. Login credentials are being emailed to them.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Staff ID or email is already in use by another account.' });
    }
    if (err.code === '23514') {
      // Check-constraint violation - most commonly the `role` column's
      // CHECK constraint predating migration_v7 (which adds 'admin_librarian'
      // as an allowed role). Run sql/migration_v7.sql against the database.
      return res.status(500).json({ message: 'Database schema is out of date (role constraint rejected "admin_librarian"). Run backend/sql/migration_v7.sql against your database.' });
    }
    res.status(500).json({ message: `Could not create Admin Librarian account. (${err.message})` });
  }
};

exports.listAdminLibrarians = async (req, res) => {
  const users = await User.findByRole('admin_librarian');
  res.json({ users });
};

exports.updateAdminLibrarian = async (req, res) => {
  const { confirm_password, full_name, email, id_number } = req.body;
  if (full_name !== undefined) {
    const e = textFieldError(full_name, 'Full name', 5);
    if (e) return res.status(400).json({ message: e });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  try {
    const user = await User.update(req.params.id, { full_name, email, id_number });
    res.json({ user });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Staff ID is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not update Admin Librarian account.' });
  }
};

exports.deleteAdminLibrarian = async (req, res) => {
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Admin Librarian account deleted.' });
};

// Admin resets an Admin Librarian's password (e.g. if they forget it)
exports.resetAdminLibrarianPassword = async (req, res) => {
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Admin Librarian password has been reset.' });
};

exports.setAccountActive = async (req, res) => {
  const { is_active } = req.body;
  const user = await User.setActive(req.params.id, is_active);
  res.json({ user });
};

// ---------------- FULL OVERSIGHT (used sparingly now) ----------------
exports.listAllUsers = async (req, res) => {
  const { role } = req.query;
  const users = role ? await User.findByRole(role) : await User.findAll();
  res.json({ users });
};

// ---------------- GLOBAL ANALYTICS ----------------
exports.globalAnalytics = async (req, res) => {
  const Resource = require('../models/Resource');
  const stats = await Resource.globalStats();
  res.json({ stats });
};

// ---------------- CATEGORIES ----------------
exports.createCategory = async (req, res) => {
  const { name, description } = req.body;
  const e = textFieldError(name, 'Category name', 5);
  if (e) return res.status(400).json({ message: e });
  const category = await Category.create(name, description);
  res.status(201).json({ category });
};

exports.updateCategory = async (req, res) => {
  const { confirm_password, name, description } = req.body;
  if (name !== undefined) {
    const e = textFieldError(name, 'Category name', 5);
    if (e) return res.status(400).json({ message: e });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const category = await Category.update(req.params.id, name, description);
  res.json({ category });
};

exports.deleteCategory = async (req, res) => {
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await Category.remove(req.params.id);
  res.json({ message: 'Category deleted.' });
};

exports.listCategoryRequests = async (req, res) => {
  const requests = await CategoryRequest.findPending();
  res.json({ requests });
};

exports.reviewCategoryRequest = async (req, res) => {
  const { decision } = req.body;
  const request = await CategoryRequest.updateStatus(req.params.id, decision, req.user.id);
  if (decision === 'approved') {
    await Category.create(request.name, request.description);
  }
  res.json({ request });
};

// ---------------- SYSTEM SETTINGS ----------------
exports.getSettings = async (req, res) => {
  const settings = await Settings.getAll();
  res.json({ settings });
};

exports.updateSettings = async (req, res) => {
  const updates = req.body;
  for (const [key, value] of Object.entries(updates)) {
    await Settings.set(key, String(value));
  }
  const settings = await Settings.getAll();
  res.json({ settings, message: 'Settings updated.' });
};
