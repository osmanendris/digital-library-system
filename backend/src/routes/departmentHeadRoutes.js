const express = require('express');
const router = express.Router();
const faculty = require('../controllers/departmentHeadController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('department_head'));

router.post('/teachers', faculty.createTeacher);
router.get('/teachers', faculty.listMyTeachers);
router.patch('/teachers/:id/active', faculty.setTeacherActive);
router.patch('/teachers/:id/reset-password', faculty.resetTeacherPassword);
router.patch('/teachers/:id', faculty.updateTeacher);
router.delete('/teachers/:id', faculty.deleteTeacher);

router.get('/teacher-resources', faculty.monitorTeacherResources); // all statuses, for oversight
router.get('/my-uploads', faculty.myUploads);
router.get('/analytics', faculty.myAnalytics);

// Approval queue - Faculty now approves/rejects THEIR OWN teachers' uploads
// (moved here from the Librarian, who still handles Faculty/Admin/Librarian
// self-uploads).
router.get('/queue', faculty.pendingQueue);
router.get('/resources/:id/review-file', faculty.reviewFile); // Q4: must view file before deciding
router.patch('/resources/:id/approve', faculty.approve);
router.patch('/resources/:id/reject', faculty.reject);

router.post('/category-requests', faculty.requestCategory);
router.get('/category-requests', faculty.myCategoryRequests);

module.exports = router;
