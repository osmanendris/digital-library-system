const express = require('express');
const router = express.Router();
const announcement = require('../controllers/announcementController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const upload = require('../middleware/uploadAnnouncementMedia');

const mediaFields = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]);

router.get('/', requireAuth, announcement.listActive); // Q3: logged-in roles only (their own "Announcements" dashboard page) - NOT shown to guests anymore
router.get('/all', requireAuth, requireRole('admin', 'admin_librarian'), announcement.listAll);
router.post('/', requireAuth, requireRole('admin', 'admin_librarian'), mediaFields, announcement.create);
router.patch('/:id', requireAuth, requireRole('admin', 'admin_librarian'), mediaFields, announcement.update);
router.patch('/:id/active', requireAuth, requireRole('admin', 'admin_librarian'), announcement.setActive);
router.delete('/:id', requireAuth, requireRole('admin', 'admin_librarian'), announcement.remove);

module.exports = router;
