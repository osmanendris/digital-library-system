const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resource = require('../models/Resource');
const CategoryRequest = require('../models/CategoryRequest');
const { verifyCurrentUserPassword } = require('../utils/verifyPassword');
const { sendCredentialsEmail } = require('../utils/sendCredentialsEmail');
const { textFieldError, idFieldError, passwordStrengthError, graduationDateError } = require('../utils/validateText');

// ============================================================
// Librarian (NEW role, Q2). Created by the Admin Librarian.
// Gets the same feature set as Faculty EXCEPT "Manage Teachers", which is
// replaced by "Manage Students" - so Students can now be registered by
// either a Librarian or an Admin Librarian.
// ============================================================

function deptCheck(department) {
  if (department && /^\d+$/.test(String(department).trim())) {
    return 'Department must be a name (e.g. "Computer Science"), not a number.';
  }
  return null;
}

// ---------------- STUDENT ACCOUNTS (replaces Faculty's "Manage Teachers") ----------------
exports.createStudent = async (req, res) => {
  try {
    const { full_name, email, password, id_number, department, expected_graduation } = req.body;
    const idErr = idFieldError(id_number, 'Student ID');
    if (idErr) return res.status(400).json({ message: idErr });
    if (!department) return res.status(400).json({ message: 'Department is required.' });
    const deptErr = deptCheck(department);
    if (deptErr) return res.status(400).json({ message: deptErr });
    { const e = textFieldError(full_name, 'Full name', 5); if (e) return res.status(400).json({ message: e }); }
    const gradErr = graduationDateError(expected_graduation);
    if (gradErr) return res.status(400).json({ message: gradErr });
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });
    const pwErr = passwordStrengthError(password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, email, password_hash, role: 'student', id_number, department, expected_graduation, created_by: req.user.id });
    // Q5: fire-and-forget so account creation responds instantly instead
    // of waiting on an SMTP round-trip (that wait was why "create" used
    // to hang for several seconds). Check the backend console if a
    // recipient says they never got the email.
    sendCredentialsEmail({ to: email, full_name, role: 'student', password }).catch(() => {});
    res.status(201).json({ user, message: 'Student account created. Login credentials are being emailed to them.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Student ID or email is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not create student account.' });
  }
};

// Every Librarian manages EVERY student, system-wide - not just ones they
// personally registered (a student created by one Librarian must still be
// manageable by any other Librarian, or by the Admin Librarian).
exports.listMyStudents = async (req, res) => {
  const users = await User.findByRole('student');
  res.json({ users });
};

exports.setStudentActive = async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found.' });
  }
  const { is_active } = req.body;
  const user = await User.setActive(req.params.id, is_active);
  res.json({ user });
};

exports.updateStudent = async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found.' });
  }
  const { confirm_password, full_name, email, id_number, department } = req.body;
  const deptErr = department !== undefined ? deptCheck(department) : null;
  if (deptErr) return res.status(400).json({ message: deptErr });
  if (full_name !== undefined) {
    const e = textFieldError(full_name, 'Full name', 5);
    if (e) return res.status(400).json({ message: e });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  try {
    const user = await User.update(req.params.id, { full_name, email, id_number, department });
    res.json({ user });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Student ID is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not update student account.' });
  }
};

exports.deleteStudent = async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found.' });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Student account removed.' });
};

exports.resetStudentPassword = async (req, res) => {
  const student = await User.findById(req.params.id);
  if (!student || student.role !== 'student') {
    return res.status(404).json({ message: 'Student not found.' });
  }
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Student password has been reset.' });
};

// ---------------- STAFF ACCOUNTS (Q8: Librarian can now create Staff too) ----------------
// Admin Librarian's staff list already shows ALL staff regardless of who
// created them (User.findByRole('staff')), so no change was needed there -
// this just gives the Librarian the ability to create/manage the staff
// THEY registered.
exports.createStaff = async (req, res) => {
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
    const user = await User.create({ full_name, email, password_hash, role: 'staff', id_number, created_by: req.user.id });
    sendCredentialsEmail({ to: email, full_name, role: 'staff', password }).catch(() => {});
    res.status(201).json({ user, message: 'Staff account created. Login credentials are being emailed to them.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Staff ID or email is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not create staff account.' });
  }
};

// Every Librarian manages EVERY staff account, system-wide - same reasoning
// as students above.
exports.listMyStaff = async (req, res) => {
  const users = await User.findByRole('staff');
  res.json({ users });
};

exports.setStaffActive = async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff || staff.role !== 'staff') {
    return res.status(404).json({ message: 'Staff not found.' });
  }
  const { is_active } = req.body;
  const user = await User.setActive(req.params.id, is_active);
  res.json({ user });
};

exports.updateStaff = async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff || staff.role !== 'staff') {
    return res.status(404).json({ message: 'Staff not found.' });
  }
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
    res.status(500).json({ message: 'Could not update staff account.' });
  }
};

exports.deleteStaff = async (req, res) => {
  const staff = await User.findById(req.params.id);
  if (!staff || staff.role !== 'staff') {
    return res.status(404).json({ message: 'Staff not found.' });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Staff account removed.' });
};

// ---------------- OWN UPLOADS (Librarian can also upload, like Faculty) ----------------
// Every Librarian upload still goes to the Admin Librarian for final
// approval (Q3) - there is no auto-publish shortcut for this role.
exports.myUploads = async (req, res) => {
  const resources = await Resource.findByUploader(req.user.id);
  res.json({ resources });
};

exports.myAnalytics = async (req, res) => {
  const result = await Resource.findByUploader(req.user.id);
  const total_resources = result.length;
  const total_views = result.reduce((sum, r) => sum + (r.view_count || 0), 0);
  const total_downloads = result.reduce((sum, r) => sum + (r.download_count || 0), 0);
  const pending_count = result.filter((r) => r.status === 'pending' || r.status === 'faculty_approved').length;
  res.json({ stats: { total_resources, total_views, total_downloads, pending_count } });
};

// ---------------- CATEGORY REQUESTS (same as Faculty) ----------------
exports.requestCategory = async (req, res) => {
  const { name, description } = req.body;
  const request = await CategoryRequest.create(req.user.id, name, description);
  res.status(201).json({ request, message: 'Category request submitted to Admin for approval.' });
};

exports.myCategoryRequests = async (req, res) => {
  const all = await CategoryRequest.findAll();
  res.json({ requests: all.filter((r) => r.requested_by === req.user.id) });
};
