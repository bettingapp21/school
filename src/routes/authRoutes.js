const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Forgot password route
router.post('/forgot-password', authController.forgotPassword);

// Reset password route
// router.post('/reset-password', authController.resetPassword);

module.exports = router;