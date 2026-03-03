const express = require('express');
const router = express.Router();
const { 
    requestPasswordReset, 
    resetPassword 
} = require('../controllers/passwordController');

router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);

module.exports = router;