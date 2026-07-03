const express = require('express');

const authController = require('../controllers/authController');
const { redirectIfLoggedIn } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/register', redirectIfLoggedIn, authController.getRegister);
router.post('/register', redirectIfLoggedIn, authController.postRegister);

router.get('/login', redirectIfLoggedIn, authController.getLogin);
router.post('/login', redirectIfLoggedIn, authController.postLogin);

router.get('/forgot-password', redirectIfLoggedIn, authController.getForgotPassword);
router.post('/forgot-password', redirectIfLoggedIn, authController.postForgotPassword);

router.post('/logout', authController.logout);
router.get('/logout', authController.logout);

module.exports = router;
