const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resource = require('../models/Resource');
const CategoryRequest = require('../models/CategoryRequest');
const { verifyCurrentUserPassword } = require('../utils/verifyPassword');
const { sendCredentialsEmail } = require('../utils/sendCredentialsEmail');
const { textFieldError, idFieldError, passwordStrengthError } = require('../utils/validateText');

// Faculty creates a Teacher account in THEIR OWN department
exports.createTeacher = async (req, res) => {
  try {
    const { full_name, email, password, id_number } = req.body;
    const idErr = idFieldError(id_number, 'Teacher ID');
    if (idErr) return res.status(400).json({ message: idErr });
    { const e = textFieldError(full_name, 'Full name', 5); if (e) return res.status(400).json({ message: e }); }
    const existing = await User.findByEmail(email);
    if (existing) return res.status(409).json({ message: 'A user with this email already exists.' });
    const pwErr = passwordStrengthError(password);
    if (pwErr) return res.status(400).json({ message: pwErr });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      full_name, email, password_hash, role: 'teacher', id_number,
      department: req.user.department, created_by: req.user.id,
    });
    // Q5: fire-and-forget so account creation responds instantly instead
    // of waiting on an SMTP round-trip (that wait was why "create" used
    // to hang for several seconds). Check the backend console if a
    // recipient says they never got the email.
    sendCredentialsEmail({ to: email, full_name, role: 'teacher', password }).catch(() => {});
    res.status(201).json({ user, message: 'Teacher account created. Login credentials are being emailed to them.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'That Staff ID is already in use by another account.' });
    }
    res.status(500).json({ message: 'Could not create teacher account.' });
  }
};

// Q2 fix: scoped by DEPARTMENT NAME, not by who created them - so
// management transfers automatically to a newly registered Department
// Head for the same department after the old one is deleted.
exports.listMyTeachers = async (req, res) => {
  const users = await User.findByRoleAndDepartment('teacher', req.user.department);
  res.json({ users });
};

exports.setTeacherActive = async (req, res) => {
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher' || teacher.department !== req.user.department) {
    return res.status(403).json({ message: 'You can only manage teachers in your own department.' });
  }
  const { is_active } = req.body;
  const user = await User.setActive(req.params.id, is_active);
  res.json({ user });
};

// Faculty edits a teacher THEY created (name/email) - requires Faculty's own password
exports.updateTeacher = async (req, res) => {
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher' || teacher.department !== req.user.department) {
    return res.status(403).json({ message: 'You can only edit teachers in your own department.' });
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
    res.status(500).json({ message: 'Could not update teacher account.' });
  }
};

// Faculty removes a teacher account THEY created - requires Faculty's own password
exports.deleteTeacher = async (req, res) => {
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher' || teacher.department !== req.user.department) {
    return res.status(403).json({ message: 'You can only remove teachers in your own department.' });
  }
  const ok = await verifyCurrentUserPassword(req.user.id, req.body.confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  await User.remove(req.params.id);
  res.json({ message: 'Teacher account removed.' });
};

// Faculty resets a teacher's password (e.g. if they forget it)
exports.resetTeacherPassword = async (req, res) => {
  const teacher = await User.findById(req.params.id);
  if (!teacher || teacher.role !== 'teacher' || teacher.department !== req.user.department) {
    return res.status(403).json({ message: 'You can only reset passwords for teachers in your own department.' });
  }
  const { confirm_password, new_password } = req.body;
  const ok = await verifyCurrentUserPassword(req.user.id, confirm_password);
  if (!ok) return res.status(401).json({ message: 'Incorrect password. Action cancelled.' });
  const pwErr = passwordStrengthError(new_password);
  if (pwErr) return res.status(400).json({ message: pwErr });
  const password_hash = await bcrypt.hash(new_password, 10);
  await User.resetPassword(req.params.id, password_hash);
  res.json({ message: 'Teacher password has been reset.' });
};

// Q2 fix: department-scoped, not created_by-scoped (see note on the model method)
exports.monitorTeacherResources = async (req, res) => {
  const resources = await Resource.findByUploaderDepartment(req.user.department);
  res.json({ resources });
};

// ---------------- APPROVAL QUEUE for Teacher uploads (moved here from Librarian) ----------------
// Faculty is now the one who approves/rejects resources uploaded by the
// teachers THEY created. Resources uploaded by Faculty themselves (or by
// Librarian/Admin) still go through the Librarian's own queue as before -
// only teacher uploads moved to their department head.
exports.pendingQueue = async (req, res) => {
  const resources = await Resource.findPendingForFaculty(req.user.department);
  res.json({ resources });
};

// Q2 fix: department-scoped, not created_by-scoped (see note on the model method)
async function assertOwnsTeacherResource(req) {
  const resource = await Resource.findById(req.params.id);
  if (!resource) return null;
  const uploader = await User.findById(resource.uploaded_by);
  if (!uploader || uploader.role !== 'teacher' || uploader.department !== req.user.department) {
    return false;
  }
  return resource;
}

// Faculty's approval is STAGE 1 ONLY (Q3) - it does not publish the
// resource. It moves to 'faculty_approved' and still needs the Admin
// Librarian's final approval before it becomes visible to anyone.
exports.approve = async (req, res) => {
  const ownership = await assertOwnsTeacherResource(req);
  if (ownership === null) return res.status(404).json({ message: 'Resource not found.' });
  if (ownership === false) return res.status(403).json({ message: 'You can only approve resources uploaded by your own teachers.' });
  const resource = await Resource.facultyApprove(req.params.id, req.user.id);
  res.json({ resource, message: 'Resource approved and forwarded to the Admin Librarian for final approval.' });
};

// A Faculty head must open/view the actual file before approving or
// rejecting it (Q4) - streams the raw file inline regardless of its
// current status, without counting as a real "view".
exports.reviewFile = async (req, res) => {
  try {
    const path = require('path');
    const fs = require('fs');
    const ownership = await assertOwnsTeacherResource(req);
    if (ownership === null) return res.status(404).json({ message: 'Resource not found.' });
    if (ownership === false) return res.status(403).json({ message: 'You can only review resources uploaded by your own teachers.' });
    const filePath = path.join(path.resolve(process.env.UPLOAD_DIR || 'src/uploads'), ownership.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File missing on server.' });
    const { streamForPreview } = require('../utils/streamPreview');
    return streamForPreview(res, filePath, ownership.file_type);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not open resource for review.' });
  }
};

exports.reject = async (req, res) => {
  const ownership = await assertOwnsTeacherResource(req);
  if (ownership === null) return res.status(404).json({ message: 'Resource not found.' });
  if (ownership === false) return res.status(403).json({ message: 'You can only reject resources uploaded by your own teachers.' });
  const { reason } = req.body;
  const reasonErr = textFieldError(reason, 'Rejection reason', 10);
  if (reasonErr) return res.status(400).json({ message: reasonErr });
  const resource = await Resource.reject(req.params.id, req.user.id, reason);
  res.json({ resource, message: 'Resource rejected.' });
};

// Faculty's own uploads (they can upload too, goes to Librarian for approval)
exports.myUploads = async (req, res) => {
  const resources = await Resource.findByUploader(req.user.id);
  res.json({ resources });
};

// Faculty-scoped analytics (their department's teachers' resource performance)
exports.myAnalytics = async (req, res) => {
  const stats = await Resource.facultyStats(req.user.department);
  res.json({ stats });
};

// Faculty requests a new category from Admin
exports.requestCategory = async (req, res) => {
  const { name, description } = req.body;
  const request = await CategoryRequest.create(req.user.id, name, description);
  res.status(201).json({ request, message: 'Category request submitted to Admin for approval.' });
};

exports.myCategoryRequests = async (req, res) => {
  const all = await CategoryRequest.findAll();
  res.json({ requests: all.filter((r) => r.requested_by === req.user.id) });
};
