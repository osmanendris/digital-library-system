const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Department = require('../models/Department');
const DeletedDepartmentHead = require('../models/DeletedDepartmentHead');
const { verifyCurrentUserPassword } = require('../utils/verifyPassword');
const { sendCredentialsEmail } = require('../utils/sendCredentialsEmail');
const { textFieldError, idFieldError, passwordStrengthError, graduationDateError } = require('../utils/validateText');

// ============================================================
// Admin Librarian (formerly "Librarian" - renamed per Q1).
// Inherits from the System Admin: Manage Faculty, All Teachers,
// All Students, All Resources, Activity Log.
// Also creates (per Q2/Q5): Faculty, Librarian (new role), Staff, Student.
// Gives FINAL approval to every resource in the system (Q3).
// ============================================================

function deptCheck(department) {
  if (department && /^\d+$/.test(String(department).trim())) {
    return 'Department must be a name (e.g. "Computer Science"), not a number.';
  }
  return null;
}

// ---------------- FACULTY ACCOUNTS (moved here from System Admin) ----------------
exports.createFaculty = async (req, res) => {
  try {
    const { full_name, email, password, id_number } = req.body;
    const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
    if (!department) return res.status(400).json({ message: 'Department is required.' });
    { const e = textFieldError(full_name, 'Full name', 5); if (e) return res.status(400).json({ message: e }); }
    const deptErr = deptCheck(department);
    if (deptErr) return res.status(400).json({ message: deptErr });
    const idErr = idFieldError(id_number, 'Staff ID');
    if (idErr) return res.status(400).json({ message: idErr });
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });
    const pwErr = passwordStrengthError(password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ full_name, email, password_hash, role: 'department_head', department, id_number, created_by: req.user.id });
    // Q5: fire-and-forget so account creation responds instantly instead
    // of waiting on an SMTP round-trip (that wait was why "create" used
    // to hang for several seconds). Check the backend console if a
    // recipient says they never got the email.
    sendCredentialsEmail({ to: email, full_name, role: 'department_head', password }).catch(() => {});
    res.status(201).json({ user, message: 'Department Head account created. Login credentials are being emailed to them.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505' && err.constraint?.includes('id_number')) {
      return res.status(409).json({ message: 'That Staff ID is already in use by another account.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: `A Department Head for the "${req.body.department}" department already exists.` });
    }
    res.status(500).json({ message: 'Could not create department head account.' });
  }
};

exports.listFaculty = async (req, res) => {
  const users = await User.findByRole('department_head');
  res.json({ users });
};

exports.updateFaculty = async (req, res) => {
  const { confirm_password, full_name, email, id_number } = req.body;
  const department = typeof req.body.department === 'string' ? req.body.department.trim() : req.body.department;
  const deptErr = deptCheck(department);
  if (deptErr) return res.status(400).json({ message: deptErr });
  if (full_name !== undefined) {
    const e = textFieldError(full_name, 'Full name', 5);
    if (e) return res.status(400).json({ message: e });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  try {
    const user = await User.update(req.params.id, { full_name, email, department, id_number });
    res.json({ user });
  } catch (err) {
    console.error(err);
    if (err.code === '23505' && err.constraint?.includes('id_number')) {
      return res.status(409).json({ message: 'That Staff ID is already in use by another account.' });
    }
    if (err.code === '23505') {
      return res.status(409).json({ message: `A Department Head for the "${department}" department already exists.` });
    }
    res.status(500).json({ message: 'Could not update department head account.' });
  }
};

exports.deleteFaculty = async (req, res) => {
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const head = await User.findById(req.params.id);
  if (head && head.department) {
    // Q4: snapshot the head's info against their department BEFORE the
    // hard delete below erases the row - this is what lets the Admin
    // Librarian see "who used to lead this department" later, when
    // assigning a replacement.
    const departments = await Department.findAll();
    const dept = departments.find((d) => d.name === head.department);
    if (dept) {
      await DeletedDepartmentHead.archive({
        department_id: dept.id,
        department_name: dept.name,
        full_name: head.full_name,
        email: head.email,
        id_number: head.id_number,
        deleted_by: req.user.id,
      });
    }
  }
  await User.remove(req.params.id);
  res.json({ message: 'Department Head account deleted.' });
};

// Q4: full history for a department - every former Department Head
// (archived at the moment they were deleted) plus every teacher ever
// created under that department, so the Admin Librarian sees this before
// assigning a brand-new head to a department that previously had one.
// Teachers are matched by department NAME (not by who created them),
// since that's copied onto their row at creation time and survives their
// creator's account being deleted.
exports.getDepartmentHistory = async (req, res) => {
  const dept = await Department.findById(req.params.id);
  if (!dept) return res.status(404).json({ message: 'Department not found.' });
  const currentHead = (await User.findByRole('department_head')).find((u) => u.department === dept.name) || null;
  const formerHeads = await DeletedDepartmentHead.findByDepartment(dept.id);
  const teachers = await User.findByRoleAndDepartment('teacher', dept.name);
  res.json({ department: dept, currentHead, formerHeads, teachers });
};

exports.resetFacultyPassword = async (req, res) => {
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Department Head password has been reset.' });
};

// ---------------- LIBRARIAN ACCOUNTS (new role, created by Admin Librarian) ----------------
exports.createLibrarian = async (req, res) => {
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
    const user = await User.create({ full_name, email, password_hash, role: 'librarian', id_number, created_by: req.user.id });
    // Q5: fire-and-forget so account creation responds instantly instead
    // of waiting on an SMTP round-trip (that wait was why "create" used
    // to hang for several seconds). Check the backend console if a
    // recipient says they never got the email.
    sendCredentialsEmail({ to: email, full_name, role: 'librarian', password }).catch(() => {});
    res.status(201).json({ user, message: 'Librarian account created. Login credentials are being emailed to them.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Staff ID or email is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not create librarian account.' });
  }
};

exports.listLibrarians = async (req, res) => {
  const users = await User.findByRole('librarian');
  res.json({ users });
};

exports.updateLibrarian = async (req, res) => {
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
    res.status(500).json({ message: 'Could not update librarian account.' });
  }
};

exports.deleteLibrarian = async (req, res) => {
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Librarian account deleted.' });
};

exports.resetLibrarianPassword = async (req, res) => {
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Librarian password has been reset.' });
};

// ---------------- STAFF ACCOUNTS (new role, created by Admin Librarian) ----------------
// Staff get all the features Students have (Q2) - so account management is
// identical in shape to Student, just a different role value.
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
    // Q5: fire-and-forget so account creation responds instantly instead
    // of waiting on an SMTP round-trip (that wait was why "create" used
    // to hang for several seconds). Check the backend console if a
    // recipient says they never got the email.
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

exports.listStaff = async (req, res) => {
  const users = await User.findByRole('staff');
  res.json({ users });
};

exports.updateStaff = async (req, res) => {
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
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Staff account deleted.' });
};

exports.resetStaffPassword = async (req, res) => {
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Staff password has been reset.' });
};

// ---------------- STUDENT ACCOUNTS (Admin Librarian's own, pre-existing feature) ----------------
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

// Q2 fix: previously only showed students THIS Admin Librarian personally
// created (findByRoleAndCreator), so students registered by a Librarian
// were invisible here and unmanageable. The Admin Librarian must be able
// to manage every student regardless of who created them.
exports.listStudents = async (req, res) => {
  const users = await User.findByRole('student');
  res.json({ users });
};

exports.setStudentActive = async (req, res) => {
  const { is_active } = req.body;
  const user = await User.setActive(req.params.id, is_active);
  res.json({ user });
};

// Generic activate/deactivate toggle, used for Faculty/Librarian/Staff too
exports.setAccountActive = async (req, res) => {
  const { is_active } = req.body;
  const user = await User.setActive(req.params.id, is_active);
  res.json({ user });
};

exports.resetStudentPassword = async (req, res) => {
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Student password has been reset.' });
};

exports.updateStudent = async (req, res) => {
  const { confirm_password, full_name, email, id_number, department, expected_graduation } = req.body;
  const deptErr = department !== undefined ? deptCheck(department) : null;
  if (deptErr) return res.status(400).json({ message: deptErr });
  if (full_name !== undefined) {
    const e = textFieldError(full_name, 'Full name', 5);
    if (e) return res.status(400).json({ message: e });
  }
  if (expected_graduation !== undefined) {
    const gradErr = graduationDateError(expected_graduation);
    if (gradErr) return res.status(400).json({ message: gradErr });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  try {
    const user = await User.update(req.params.id, { full_name, email, id_number, department, expected_graduation });
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
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Student account removed.' });
};

// ---------------- READ-ONLY GLOBAL OVERSIGHT (moved here from System Admin) ----------------
exports.listAllTeachers = async (req, res) => {
  const users = await User.findByRole('teacher');
  res.json({ users });
};

// "All Students" system-wide, distinct from the Admin Librarian's OWN
// students list above (which only shows ones they personally registered -
// students can also be registered by a Librarian, per Q2/Q5).
exports.listAllStudentsGlobal = async (req, res) => {
  const users = await User.findByRole('student');
  res.json({ users });
};

// ---------------- APPROVAL QUEUE (final say on every resource - Q3) ----------------
exports.pendingQueue = async (req, res) => {
  const resources = await Resource.findPending();
  res.json({ resources });
};

// All resources regardless of status, for editing/deleting. Optional ?status= filter.
exports.viewAllResources = async (req, res) => {
  const { status } = req.query;
  let resources = await Resource.findAllForAdmin();
  if (status) resources = resources.filter((r) => r.status === status);
  res.json({ resources });
};

exports.approve = async (req, res) => {
  const resource = await Resource.approve(req.params.id, req.user.id);
  res.json({ resource, message: 'Resource approved and published.' });
};

exports.reject = async (req, res) => {
  const { reason } = req.body;
  const reasonErr = textFieldError(reason, 'Rejection reason', 10);
  if (reasonErr) return res.status(400).json({ message: reasonErr });
  const resource = await Resource.reject(req.params.id, req.user.id, reason);
  res.json({ resource, message: 'Resource rejected.' });
};

// Admin Librarian can edit metadata of ANY resource (consistency/quality control)
exports.editAnyMetadata = async (req, res) => {
  const resource = await Resource.updateMetadata(req.params.id, req.body);
  res.json({ resource });
};

// Admin Librarian can delete any resource (copyright violations etc.) - requires password
exports.deleteResource = async (req, res) => {
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await Resource.remove(req.params.id);
  res.json({ message: 'Resource deleted.' });
};

// A reviewer must open/view the actual file before they can approve or
// reject it (Q4) - streams the raw file inline regardless of its current
// status, WITHOUT counting as a real "view" (no History log, no view_count
// bump), since this is a review action, not a reader session.
exports.reviewFile = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const resource = await Resource.findById(req.params.id);
    if (!resource) return res.status(404).json({ message: 'Resource not found.' });
    const filePath = path.join(path.resolve(process.env.UPLOAD_DIR || 'src/uploads'), resource.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server.' });
    const { streamForPreview } = require('../utils/streamPreview');
    return streamForPreview(res, filePath, resource.file_type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not open resource for review.' });
  }
};

// ---------------- LIBRARY-WIDE ANALYTICS ----------------
exports.analytics = async (req, res) => {
  const stats = await Resource.globalStats();
  res.json({ stats });
};

// Full activity log: who viewed/downloaded what (moved here from System Admin)
exports.activityLog = async (req, res) => {
  const { action } = req.query;
  if (!['viewed', 'downloaded'].includes(action)) {
    return res.status(400).json({ message: 'action query param must be "viewed" or "downloaded".' });
  }
  const History = require('../models/History');
  const activity = await History.findAllByAction(action);
  res.json({ activity });
};
