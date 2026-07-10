const adminModel = require('../models/adminModel');
const reviewModel = require('../models/reviewModel');
const db = require('../models');
const path = require('path');
const { buildTransactionUpdateEmail, sendTransactionUpdateEmail } = require('../services/mailService');
const { generateReceiptPdf } = require('../services/receiptService');
const Category = db.Category;

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
    const order = await adminModel.getOrderById(req.params.id);

    if (!order) {
      return res.status(404).send('Order not found.');
    }

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
    const [product, categories] = await Promise.all([
      adminModel.getProductById(req.params.id),
      adminModel.getCategories(),
    ]);

    if (!product) {
      return res.status(404).send('Product not found.');
    }

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
    const category = await adminModel.getCategoryById(req.params.id);

    if (!category) {
      return res.status(404).send('Category not found.');
    }

    return renderCategoryForm(res, 'Edit Category', `/admin/categories/${category.id}`, category);
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

    await category.destroy();

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

    await adminModel.updateOrderItemStatus(req.params.itemId, req.body.status);

    const order = await adminModel.getOrderByItemId(req.params.itemId);
    let emailStatus = 'sent';

    if (order) {
      try {
        const receiptPdf = await generateReceiptPdf(order);
        const mailResult = await sendTransactionUpdateEmail({
          to: order.email,
          subject: `KitKart Order #${order.id} Status Updated`,
          html: buildTransactionUpdateEmail({ order, status: req.body.status }),
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
    }

    return res.json({
      success: true,
      message: emailStatus === 'sent'
        ? 'Updated. Email receipt sent.'
        : emailStatus === 'skipped'
          ? 'Updated. Email skipped because Mailtrap is not configured.'
          : 'Updated. Email receipt could not be sent.',
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
  updateCategoryApi,
  updateUserRole,
  updateUserStatus,
  users,
  updateOrderItemStatus
};
