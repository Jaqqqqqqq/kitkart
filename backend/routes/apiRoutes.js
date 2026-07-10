const express = require('express');
const multer = require('multer');
const path = require('path');

const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const cartController = require('../controllers/cartController');
const dashboardController = require('../controllers/dashboardController');
const orderController = require('../controllers/orderController');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/reviewController');
const { isAuthenticatedUser, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ dest: path.resolve(__dirname, '..', '..', 'frontend', 'images') });
const productUpload = upload.any();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/logout', isAuthenticatedUser, authController.logoutUser);
router.get('/me', isAuthenticatedUser, async (req, res) => {
  const user = await require('../controllers/customerController').getCurrentUser(req);
  return res.json({ success: true, result: user });
});

router.get('/users', isAuthenticatedUser, authorizeRoles('admin'), adminController.getAllUsers);
router.put('/users/:id/role', isAuthenticatedUser, authorizeRoles('admin'), adminController.updateUserRole);
router.put('/users/:id/status', isAuthenticatedUser, authorizeRoles('admin'), adminController.updateUserStatus);

router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getSingleProduct);
router.post('/products', isAuthenticatedUser, authorizeRoles('admin'), productUpload, productController.createProductApi);
router.put('/products/:id', isAuthenticatedUser, authorizeRoles('admin'), productUpload, productController.updateProductApi);
router.delete('/products/:id', isAuthenticatedUser, authorizeRoles('admin'), productController.deleteProductApi);

router.get('/categories', adminController.getAllCategories);
router.get('/categories/:id', adminController.getSingleCategory);
router.post('/categories', isAuthenticatedUser, authorizeRoles('admin'), adminController.createCategoryApi);
router.put('/categories/:id', isAuthenticatedUser, authorizeRoles('admin'), adminController.updateCategoryApi);
router.delete('/categories/:id', isAuthenticatedUser, authorizeRoles('admin'), adminController.deleteCategoryApi);

router.get('/cart', isAuthenticatedUser, cartController.getCart);
router.post('/cart', isAuthenticatedUser, cartController.addToCart);
router.put('/cart/:id/increase', isAuthenticatedUser, cartController.increaseCartItem);
router.put('/cart/:id/decrease', isAuthenticatedUser, cartController.decreaseCartItem);
router.delete('/cart/:id', isAuthenticatedUser, cartController.removeCartItem);

router.get('/checkout', isAuthenticatedUser, orderController.getCheckout);
router.post('/orders', isAuthenticatedUser, orderController.createOrder);
router.get('/orders', isAuthenticatedUser, orderController.getOrders);
router.get('/orders/:id', isAuthenticatedUser, orderController.getSingleOrder);

router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.post('/reviews', isAuthenticatedUser, reviewController.createReview);
router.put('/reviews/:id', isAuthenticatedUser, reviewController.updateReview);
router.delete('/reviews/:id', isAuthenticatedUser, reviewController.deleteReview);

router.get('/dashboard/sales-chart', isAuthenticatedUser, authorizeRoles('admin'), dashboardController.salesChart);
router.get('/dashboard/items-chart', isAuthenticatedUser, authorizeRoles('admin'), dashboardController.itemsChart);
router.get('/dashboard/users-chart', isAuthenticatedUser, authorizeRoles('admin'), dashboardController.usersChart);

module.exports = router;
