const express = require('express');

const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAdmin);

router.get('/orders', adminController.orders);
router.get('/orders/:id', adminController.orderDetails);

router.get('/products', adminController.products);
router.get('/products/new', adminController.newProduct);
router.post('/products', adminController.createProduct);
router.get('/products/:id/edit', adminController.editProduct);
router.post('/products/:id', adminController.updateProduct);
router.post('/products/:id/delete', adminController.deleteProduct);

router.get('/categories', adminController.categories);
router.get('/categories/new', adminController.newCategory);
router.post('/categories', adminController.createCategory);
router.get('/categories/:id/edit', adminController.editCategory);
router.post('/categories/:id', adminController.updateCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);

router.get('/users', adminController.users);

module.exports = router;
