const express = require('express');

const productController = require('../controllers/productController');
const { requireLogin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireLogin, productController.index);
router.get('/:id', requireLogin, productController.show);

module.exports = router;
