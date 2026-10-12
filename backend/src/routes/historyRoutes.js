const express = require('express');
const router = express.Router();
const history = require('../controllers/historyController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', history.list);

module.exports = router;
