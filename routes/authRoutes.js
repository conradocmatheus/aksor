const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkAuth } = require('../middleware/authMiddleware');

router.get('/login', authController.getLoginPage);
router.get('/signup', authController.getSignupPage);
router.post('/signup', authController.signupUser);
router.post('/sessionLogin', authController.sessionLogin);
router.get('/logout', authController.logoutUser);
router.get('/dashboard', checkAuth, authController.getDashboard);

module.exports = router;