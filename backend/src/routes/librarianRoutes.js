const express = require('express');
const router = express.Router();
const librarian = require('../controllers/librarianController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// NEW "Librarian" role (Q2) - created by the Admin Librarian. Gets
// Faculty's feature set except "Manage Teachers" is replaced by
// "Manage Students" (students can now be registered by either a
// Librarian or an Admin Librarian).
router.use(requireAuth, requireRole('librarian'));

router.post('/students', librarian.createStudent);
router.get('/students', librarian.listMyStudents);
router.patch('/students/:id/active', librarian.setStudentActive);
router.patch('/students/:id/reset-password', librarian.resetStudentPassword);
router.patch('/students/:id', librarian.updateStudent);
router.delete('/students/:id', librarian.deleteStudent);

router.post('/staff', librarian.createStaff);
router.get('/staff', librarian.listMyStaff);
router.patch('/staff/:id/active', librarian.setStaffActive);
router.patch('/staff/:id', librarian.updateStaff);
router.delete('/staff/:id', librarian.deleteStaff);

router.get('/my-uploads', librarian.myUploads);
router.get('/analytics', librarian.myAnalytics);

router.post('/category-requests', librarian.requestCategory);
router.get('/category-requests', librarian.myCategoryRequests);

module.exports = router;
