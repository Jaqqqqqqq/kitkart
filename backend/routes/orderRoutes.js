const express = require('express');

const orderController = require('../controllers/orderController');
const { requireCustomer } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/checkout', requireCustomer, orderController.checkoutPage);
router.post('/checkout', requireCustomer, orderController.placeOrder);
router.get('/orders', requireCustomer, orderController.orderHistory);
router.get('/orders/:orderId/confirmation', requireCustomer, orderController.confirmationPage);
router.get('/orders/:orderId', requireCustomer, orderController.orderDetails);

module.exports = router;
