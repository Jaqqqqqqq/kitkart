const express = require('express');

const cartController = require('../controllers/cartController');
const { requireLogin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', requireLogin, cartController.showCart);
router.post('/items', requireLogin, cartController.addItem);
router.post('/items/:itemId/increase', requireLogin, cartController.increaseItem);
router.post('/items/:itemId/decrease', requireLogin, cartController.decreaseItem);
router.post('/items/:itemId/remove', requireLogin, cartController.removeItem);

module.exports = router;
