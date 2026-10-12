const express = require('express');
const router = express.Router();
const adminLibrarian = require('../controllers/adminLibrarianController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('admin_librarian'));

// Faculty accounts (moved here from System Admin - Q1)
router.post('/department-heads', adminLibrarian.createFaculty);
router.get('/department-heads', adminLibrarian.listFaculty);
router.patch('/department-heads/:id', adminLibrarian.updateFaculty);
router.patch('/department-heads/:id/reset-password', adminLibrarian.resetFacultyPassword);
router.delete('/department-heads/:id', adminLibrarian.deleteFaculty);

// Q4: department history (former head(s) + teachers they created) - shown
// when assigning a new Department Head to a department that had one before.
router.get('/departments/:id/history', adminLibrarian.getDepartmentHistory);

// Librarian accounts (new role - Q2)
router.post('/librarians', adminLibrarian.createLibrarian);
router.get('/librarians', adminLibrarian.listLibrarians);
router.patch('/librarians/:id', adminLibrarian.updateLibrarian);
router.patch('/librarians/:id/reset-password', adminLibrarian.resetLibrarianPassword);
router.delete('/librarians/:id', adminLibrarian.deleteLibrarian);

// Staff accounts (new role - Q2)
router.post('/staff', adminLibrarian.createStaff);
router.get('/staff', adminLibrarian.listStaff);
router.patch('/staff/:id', adminLibrarian.updateStaff);
router.patch('/staff/:id/reset-password', adminLibrarian.resetStaffPassword);
router.delete('/staff/:id', adminLibrarian.deleteStaff);

// Student accounts (own registrations - pre-existing feature)
router.post('/students', adminLibrarian.createStudent);
router.get('/students', adminLibrarian.listStudents);
router.patch('/students/:id/active', adminLibrarian.setStudentActive);
router.patch('/students/:id/reset-password', adminLibrarian.resetStudentPassword);
router.patch('/students/:id', adminLibrarian.updateStudent);
router.delete('/students/:id', adminLibrarian.deleteStudent);

// Read-only global oversight (moved here from System Admin - Q1)
router.get('/all-teachers', adminLibrarian.listAllTeachers);
router.get('/all-students', adminLibrarian.listAllStudentsGlobal);

// Activate/deactivate any account this role manages
router.patch('/users/:id/active', adminLibrarian.setStudentActive);

// Approval queue - the FINAL gatekeeper job for every resource (Q3)
router.get('/queue', adminLibrarian.pendingQueue);
router.get('/resources', adminLibrarian.viewAllResources);
router.get('/resources/:id/review-file', adminLibrarian.reviewFile); // Q4: must view file before deciding
router.patch('/resources/:id/approve', adminLibrarian.approve);
router.patch('/resources/:id/reject', adminLibrarian.reject);
router.patch('/resources/:id', adminLibrarian.editAnyMetadata);
router.delete('/resources/:id', adminLibrarian.deleteResource);

// Library-wide analytics + activity log (moved here from System Admin - Q1)
router.get('/analytics', adminLibrarian.analytics);
router.get('/activity', adminLibrarian.activityLog);

module.exports = router;
