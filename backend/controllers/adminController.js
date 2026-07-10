const adminModel = require('../models/adminModel');
const reviewModel = require('../models/reviewModel');
const db = require('../models');
const path = require('path');
const { buildTransactionUpdateEmail, sendTransactionUpdateEmail } = require('../services/mailService');
const { generateReceiptPdf } = require('../services/receiptService');
const Category = db.Category;
const Product = db.Product;
const ProductImage = db.ProductImage;
const CartItem = db.CartItem;
const OrderItem = db.OrderItem;
const Review = db.Review;
const sequelize = db.sequelize;

function productFormDefaults(product = {}) {
  return {
    id: product.id || null,
    category_id: product.category_id || '',
    product_name: product.product_name || '',
    description: product.description || '',
    price: product.price ?? '',
    stock_quantity: product.stock_quantity ?? '',
    image: product.image || '',
    images: product.images || [],
  };
}

function categoryFormDefaults(category = {}) {
  return {
    id: category.id || null,
    category_name: category.category_name || '',
    description: category.description || '',
  };
}

async function orders(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-orders.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load orders.');
  }
}

async function orderDetails(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-order-show.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order details.');
  }
}

async function products(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-products.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load products.');
  }
}

async function newProduct(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-product-form.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load product form.');
  }
}

async function editProduct(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-product-form.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load product form.');
  }
}

async function categories(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-categories.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load categories.');
  }
}

function renderCategoryForm(res, title, action, category, error = null, statusCode = 200) {
  return res.status(statusCode).sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-category-form.html'));
}

function newCategory(req, res) {
  return renderCategoryForm(res, 'Add Category', '/admin/categories', {});
}

async function editCategory(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-category-form.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load category form.');
  }
}

async function users(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-users.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load user accounts.');
  }
}

async function reviews(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-reviews.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load reviews.');
  }
}

async function updateUserRole(req, res) {
  try {
    await adminModel.updateUserRole(req.params.id, req.body.role);

    return res.json({
      success: true,
      message: 'User role updated.',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to update role.',
    });
  }
}

async function updateUserStatus(req, res) {
  try {
    await adminModel.updateUserStatus(req.params.id, req.body.status);

    return res.json({
      success: true,
      message: 'User status updated.',
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Unable to update status.',
    });
  }
}

async function getAllUsers(req, res) {
  try {
    const allUsers = await adminModel.getUsers();

    return res.status(200).json({
      success: true,
      rows: allUsers,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching users',
    });
  }
}

async function getAllCategories(req, res) {
  try {
    const allCategories = await Category.findAll({ order: [['category_name', 'ASC']] });

    return res.status(200).json({
      success: true,
      rows: allCategories,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error fetching categories' });
  }
}

async function getSingleCategory(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    return res.status(200).json({ success: true, result: category });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error fetching category' });
  }
}

async function createCategoryApi(req, res) {
  try {
    console.log('Category API Request:', {
      method: req.method,
      url: req.url,
      headers: req.headers['content-type'],
      bodyType: typeof req.body,
      body: req.body,
    });

    const { category_name, description } = req.body;

    if (!category_name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const category = await Category.create({ category_name, description });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      result: category,
    });
  } catch (error) {
    console.error('Category creation error:', error.message, error);
    return res.status(500).json({ success: false, message: error.message || 'Error creating category' });
  }
}

async function updateCategoryApi(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await category.update({
      category_name: req.body.category_name || category.category_name,
      description: req.body.description || category.description,
    });

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      result: category,
    });
  } catch (error) {
    console.error('Category update error:', error.message, error);
    return res.status(500).json({ success: false, message: error.message || 'Error updating category' });
  }
}

async function deleteCategoryApi(req, res) {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await sequelize.transaction(async (transaction) => {
      const products = await Product.findAll({
        where: { category_id: category.id },
        attributes: ['id'],
        transaction,
      });
      const productIds = products.map((product) => product.id);

      if (productIds.length > 0) {
        await Review.destroy({ where: { product_id: productIds }, transaction });
        await CartItem.destroy({ where: { product_id: productIds }, transaction });
        await OrderItem.destroy({ where: { product_id: productIds }, transaction });
        await ProductImage.destroy({ where: { product_id: productIds }, transaction });
        await Product.destroy({ where: { id: productIds }, transaction });
      }

      await category.destroy({ transaction });
    });

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    console.error('Category delete error:', error.message, error);
    return res.status(500).json({ success: false, message: error.message || 'Error deleting category' });
  }
}

async function updateOrderItemStatus(req, res) {
  try {
    console.log('Update order status request:', {
      itemId: req.params.itemId,
      status: req.body.status,
      method: req.method,
      user: req.session?.user?.email || 'No session',
    });

    const order = await adminModel.getOrderByItemId(req.params.itemId);
    const currentItem = order?.items?.find((item) => String(item.id) === String(req.params.itemId));
    let emailStatus = 'sent';

    if (order && currentItem) {
      try {
        await adminModel.updateOrderItemStatus(req.params.itemId, req.body.status);
        const receiptPdf = await generateReceiptPdf({
          orderId: order.id,
          createdAt: order.created_at,
          customerName: `${order.first_name || ''} ${order.last_name || ''}`.trim(),
          email: order.email,
          paymentMethod: order.payment_method,
          item: currentItem,
          status: req.body.status,
        });
        const mailResult = await sendTransactionUpdateEmail({
          to: order.email,
          subject: `KitKart Order #${order.id} Status Updated`,
          html: buildTransactionUpdateEmail({
            orderId: order.id,
            customerName: `${order.first_name || ''} ${order.last_name || ''}`.trim(),
            item: currentItem,
            status: req.body.status,
            paymentMethod: order.payment_method,
          }),
          attachments: [
            {
              filename: `kitkart-order-${order.id}-receipt.pdf`,
              content: receiptPdf,
              contentType: 'application/pdf',
            },
          ],
        });

        emailStatus = mailResult?.skipped ? 'skipped' : 'sent';
      } catch (mailError) {
        emailStatus = 'failed';
        console.error('Unable to send transaction update email:', mailError);
      }
    } else {
      await adminModel.updateOrderItemStatus(req.params.itemId, req.body.status);
    }

    return res.json({
      success: true,
      message: emailStatus === 'sent'
        ? 'Order status updated successfully. Email receipt sent.'
        : emailStatus === 'skipped'
          ? 'Order status updated successfully. Email skipped because Mailtrap is not configured.'
          : 'Order status updated successfully. Email receipt could not be sent.',
      emailStatus,
    });
  } catch (err) {
    console.error('Error updating order status:', {
      itemId: req.params.itemId,
      error: err.message,
      stack: err.stack,
    });

    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Unable to update item status.',
    });
  }
}

async function deleteProductApi(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await sequelize.transaction(async (transaction) => {
      await Review.destroy({ where: { product_id: product.id }, transaction });
      await CartItem.destroy({ where: { product_id: product.id }, transaction });
      await OrderItem.destroy({ where: { product_id: product.id }, transaction });
      await ProductImage.destroy({ where: { product_id: product.id }, transaction });
      await product.destroy({ transaction });
    });

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.error('Product delete error:', error.message, error);
    return res.status(500).json({ success: false, message: error.message || 'Error deleting product' });
  }
}

async function getOrdersApi(req, res) {
  try {
    const rows = await adminModel.getAllOrders();
    return res.json({ success: true, rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch orders.' });
  }
}

async function getOrderApi(req, res) {
  try {
    const result = await adminModel.getOrderById(req.params.id);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch order.' });
  }
}

async function getReviewsApi(req, res) {
  try {
    const rows = await reviewModel.getReviewsForAdmin();
    return res.json({ success: true, rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch reviews.' });
  }
}

async function getProductApi(req, res) {
  try {
    const result = await adminModel.getProductById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch product.' });
  }
}

async function getCategoryApi(req, res) {
  try {
    const result = await adminModel.getCategoryById(req.params.id);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    return res.json({ success: true, result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to fetch category.' });
  }
}

module.exports = {
  categories,
  createCategoryApi,
  deleteCategoryApi,
  editCategory,
  editProduct,
  getAllCategories,
  getAllUsers,
  getSingleCategory,
  newCategory,
  newProduct,
  orderDetails,
  orders,
  products,
  reviews,
  getOrdersApi,
  getOrderApi,
  getReviewsApi,
  getProductApi,
  getCategoryApi,
  deleteProductApi,
  updateCategoryApi,
  updateUserRole,
  updateUserStatus,
  users,
  updateOrderItemStatus
};
