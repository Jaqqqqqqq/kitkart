const express = require('express');

const reviewController = require('../controllers/reviewController');
const { requireCustomer } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/products/:productId/reviews', requireCustomer, reviewController.create);
router.get('/reviews/:reviewId/edit', requireCustomer, reviewController.edit);
router.post('/reviews/:reviewId/edit', requireCustomer, reviewController.update);
router.post('/reviews/:reviewId/delete', requireCustomer, reviewController.remove);

module.exports = router;
