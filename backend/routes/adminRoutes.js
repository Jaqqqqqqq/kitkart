const express = require('express');
const multer = require('multer');

const adminController = require('../controllers/adminController');
const dashboardController = require('../controllers/dashboardController');
const { requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({
  dest: 'public/images/',
});

router.use(requireAdmin);

router.get('/dashboard', dashboardController.dashboard);
router.get('/orders', adminController.orders);
router.get('/orders/:id', adminController.orderDetails);
router.get('/products', adminController.products);
router.get('/products/new', adminController.newProduct);
router.get('/products/:id/edit', adminController.editProduct);
router.post('/products/:id/delete', adminController.deleteProduct);
router.post(
  '/products',
  upload.single('image'),
  adminController.createProduct
);

router.post(
  '/products/:id',
  upload.single('image'),
  adminController.updateProduct
);


router.get('/categories', adminController.categories);
router.get('/categories/new', adminController.newCategory);
router.post('/categories', adminController.createCategory);
router.get('/categories/:id/edit', adminController.editCategory);
router.post('/categories/:id', adminController.updateCategory);
router.post('/categories/:id/delete', adminController.deleteCategory);

router.get('/users', adminController.users);
router.post('/users/:id/role', adminController.updateUserRole);
router.post('/users/:id/status', adminController.updateUserStatus);

module.exports = router;
