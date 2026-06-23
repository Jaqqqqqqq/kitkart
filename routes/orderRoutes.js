const express = require('express');

const orderController = require('../controllers/orderController');
const { requireLogin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/checkout', requireLogin, orderController.checkoutPage);
router.post('/checkout', requireLogin, orderController.placeOrder);
router.get('/orders', requireLogin, orderController.orderHistory);
router.get('/orders/:orderId/confirmation', requireLogin, orderController.confirmationPage);
router.get('/orders/:orderId', requireLogin, orderController.orderDetails);

module.exports = router;
