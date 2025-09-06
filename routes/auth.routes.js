'use strict';

const router = require('express').Router();
const auth = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');
const {
  signup,
  login,
  me,
  verifyEmail,
  resendCode,
  forgotPassword,
  resetPassword,
  changePassword
} = require('../controllers/auth.controller');

router.post('/signup', signup);

router.post('/login', login);

// router.get('/me', auth, me);

router.post('/verify-email', verifyEmail);

router.post('/resend-code', resendCode);

router.post('/user/forgot-password', forgotPassword);

router.post('/user/reset-password', resetPassword);

router.post('/user/change-password/:id', auth, changePassword);

module.exports = router;
