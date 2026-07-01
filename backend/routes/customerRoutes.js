const express = require('express');

const customerController = require('../controllers/customerController');
const { requireCustomer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/home', requireCustomer, customerController.home);
router.get('/profile', requireCustomer, customerController.profile);

module.exports = router;
