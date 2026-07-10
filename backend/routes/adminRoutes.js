const express = require('express');

const adminController = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');
const { requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireRole('admin', 'Only administrators can access this page.'));

router.get('/dashboard', dashboardController.dashboard);
router.get('/charts', dashboardController.charts);
router.get('/api/orders', adminController.getOrdersApi);
router.get('/api/orders/:id', adminController.getOrderApi);
router.get('/api/reviews', adminController.getReviewsApi);
router.get('/api/products/:id', adminController.getProductApi);
router.get('/api/categories/:id', adminController.getCategoryApi);
router.delete('/api/products/:id', adminController.deleteProductApi);
router.delete('/api/categories/:id', adminController.deleteCategoryApi);
router.get('/orders', adminController.orders);
router.get('/orders/:id', adminController.orderDetails);
router.get('/reviews', adminController.reviews);
router.get('/products', adminController.products);
router.post('/products', (req, res) => res.status(400).json({
  success: false,
  message: 'Missing product id. Please refresh the products page and try deleting again.',
}));
router.get('/products/new', adminController.newProduct);
router.get('/products/:id/edit', adminController.editProduct);
router.post('/products/:id/delete', adminController.deleteProductApi);
router.put('/orders/items/:itemId/status',adminController.updateOrderItemStatus);

router.get('/categories', adminController.categories);
router.post('/categories', (req, res) => res.status(400).json({
  success: false,
  message: 'Missing category id. Please refresh the categories page and try deleting again.',
}));
router.get('/categories/new', adminController.newCategory);
router.get('/categories/:id/edit', adminController.editCategory);
router.post('/categories/:id/delete', adminController.deleteCategoryApi);

router.get('/users', adminController.users);
router.post('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/status', adminController.updateUserStatus);

module.exports = router;
