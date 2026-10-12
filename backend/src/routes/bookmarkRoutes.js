const express = require('express');
const router = express.Router();
const bookmark = require('../controllers/bookmarkController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth); // any logged-in role can save favorites
router.get('/', bookmark.list);
router.post('/:resourceId', bookmark.add);
router.delete('/:resourceId', bookmark.remove);

module.exports = router;
