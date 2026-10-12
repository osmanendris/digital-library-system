const express = require('express');
const router = express.Router();
const resource = require('../controllers/resourceController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/upload');

// Every resource route now requires login - no guest can see any book
// metadata, read, or download before authenticating.
router.get('/', requireAuth, resource.browse);
router.get('/:id', requireAuth, resource.getById);
router.get('/:id/read', requireAuth, resource.readOnline);
router.get('/:id/download', requireAuth, resource.download);

// Upload: Teacher, Faculty, Librarian, Admin Librarian, or Admin - every
// upload still enters the approval pipeline (Q3) except an Admin
// Librarian's own "publish immediately" self-uploads.
router.post(
  '/',
  requireAuth,
  requireRole('teacher', 'department_head', 'librarian', 'admin_librarian', 'admin'),
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  resource.upload
);
router.get('/mine/uploads', requireAuth, requireRole('teacher', 'department_head', 'librarian', 'admin_librarian', 'admin'), resource.myUploads);
router.patch('/:id/edit-own', requireAuth, requireRole('teacher', 'department_head', 'admin_librarian', 'admin'), resource.editOwnMetadata);

module.exports = router;
