const express = require('express');
const router = express.Router();
const settings = require('../controllers/settingsPublicController');

router.get('/', settings.getPublic); // public - just config, no secrets

module.exports = router;
