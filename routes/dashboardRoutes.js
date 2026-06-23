const express = require('express');

const dashboardController = require('../controllers/dashboardController');
const { requireLogin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', requireLogin, dashboardController.dashboard);

module.exports = router;
