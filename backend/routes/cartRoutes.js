const express = require('express');

const cartController = require('../controllers/cartController');
const { requireCustomer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireCustomer, cartController.showCart);
router.post('/items', requireCustomer, cartController.addItem);
router.post('/items/:itemId/increase', requireCustomer, cartController.increaseItem);
router.post('/items/:itemId/decrease', requireCustomer, cartController.decreaseItem);
router.post('/items/:itemId/remove', requireCustomer, cartController.removeItem);

module.exports = router;
