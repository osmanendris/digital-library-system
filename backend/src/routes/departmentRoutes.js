const express = require('express');
const router = express.Router();
const department = require('../controllers/departmentController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Any logged-in role can view the list (needed for the create-account dropdown).
router.get('/', requireAuth, department.list);

// Only the Admin Librarian manages the list (they're the one who creates
// Department Heads / Faculty).
router.post('/', requireAuth, requireRole('admin_librarian'), department.create);
router.patch('/:id', requireAuth, requireRole('admin_librarian'), department.update);
router.delete('/:id', requireAuth, requireRole('admin_librarian'), department.remove);

module.exports = router;
