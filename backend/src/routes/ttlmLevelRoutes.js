const express = require('express');
const router = express.Router();
const ttlmLevel = require('../controllers/ttlmLevelController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Any logged-in role can view the list (needed for the upload form and
// the Browse Library level filter).
router.get('/', requireAuth, ttlmLevel.list);

// Only the Admin Librarian manages the list.
router.post('/', requireAuth, requireRole('admin_librarian'), ttlmLevel.create);
router.patch('/:id', requireAuth, requireRole('admin_librarian'), ttlmLevel.update);
router.delete('/:id', requireAuth, requireRole('admin_librarian'), ttlmLevel.remove);

module.exports = router;
