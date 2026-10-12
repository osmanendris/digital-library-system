const express = require('express');
const router = express.Router();
const request = require('../controllers/requestController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Staff get all the features Students have (Q2), including requesting resources.
router.post('/', requireAuth, requireRole('student', 'staff'), request.create);
router.get('/mine', requireAuth, requireRole('student', 'staff'), request.myRequests);

// Admin Librarian manages all requests (renamed from Librarian - Q1)
router.get('/', requireAuth, requireRole('admin_librarian'), request.allRequests);
router.patch('/:id', requireAuth, requireRole('admin_librarian'), request.updateStatus);

module.exports = router;
