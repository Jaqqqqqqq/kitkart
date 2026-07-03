const express = require('express');

const customerController = require('../controllers/customerController');
const { requireCustomer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/home', requireCustomer, customerController.home);
router.get('/profile', requireCustomer, customerController.profile);
router.get('/profile/edit', requireCustomer, customerController.editProfile);
router.get('/profile/password', requireCustomer, customerController.changePasswordPage);

router.post('/profile/edit', requireCustomer, customerController.updateProfile);
router.post('/profile', requireCustomer, customerController.updateProfile);
router.post('/profile/password', requireCustomer, customerController.updatePassword);
router.get('/profile/password', requireCustomer, customerController.changePasswordPage);

module.exports = router;
