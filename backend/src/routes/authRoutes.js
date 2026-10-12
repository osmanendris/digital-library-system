const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPasswordWithOtp);
router.get('/me', requireAuth, auth.me);
router.put('/profile', requireAuth, auth.updateProfile);       // any role
router.put('/change-password', requireAuth, auth.changePassword); // any role

module.exports = router;
