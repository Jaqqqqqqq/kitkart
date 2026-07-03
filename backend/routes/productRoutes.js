const express = require('express');

const productController = require('../controllers/productController');
const { requireCustomer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireCustomer, productController.index);
router.get('/:id', requireCustomer, productController.show);

module.exports = router;


