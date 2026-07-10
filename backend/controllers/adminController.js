const adminModel = require('../models/adminModel');
const reviewModel = require('../models/reviewModel');
const db = require('../models');
const { sendTransactionUpdateEmail } = require('../services/mailService');
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
    const allOrders = await adminModel.getAllOrders();

    return res.render('admin/orders/index', {
      title: 'All Orders',
      orders: allOrders,
    });
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

    return res.render('admin/orders/show', {
      title: `Order #${order.id}`,
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order details.');
  }
}

async function products(req, res) {
  try {
    const allProducts = await adminModel.getProducts();

    return res.render('admin/products/index', {
      title: 'Manage Products',
      products: allProducts,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load products.');
  }
}

async function newProduct(req, res) {
  try {
    const categories = await adminModel.getCategories();

    return res.render('admin/products/form', {
      title: 'Add Product',
      action: '/admin/products',
      product: productFormDefaults(),
      categories,
      error: null,
    });
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

    return res.render('admin/products/form', {
      title: 'Edit Product',
      action: `/admin/products/${product.id}`,
      product: productFormDefaults(product),
      categories,
      error: null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load product form.');
  }
}

async function categories(req, res) {
  try {
    const allCategories = await adminModel.getCategories();

    return res.render('admin/categories/index', {
      title: 'Manage Categories',
      categories: allCategories,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load categories.');
  }
}

function renderCategoryForm(res, title, action, category, error = null, statusCode = 200) {
  return res.status(statusCode).render('admin/categories/form', {
    title,
    action,
    category: categoryFormDefaults(category),
    error,
  });
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
    const allUsers = await adminModel.getUsers();

    return res.render('admin/users/index', {
      title: 'User Accounts',
      users: allUsers,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load user accounts.');
  }
}

async function reviews(req, res) {
  try {
    const allReviews = await reviewModel.getReviewsForAdmin();

    return res.render('admin/reviews/index', {
      title: 'Customer Reviews',
      reviews: allReviews,
    });
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

async function updateOrderItemStatus(req,res){

    try{
        console.log('Update order status request:', {
            itemId: req.params.itemId,
            status: req.body.status,
            method: req.method,
            user: req.session?.user?.email || 'No session'
        });

        await adminModel.updateOrderItemStatus(

            req.params.itemId,
            req.body.status

        );

        const order = await adminModel.getOrderByItemId(req.params.itemId);
        let emailStatus = 'sent';

        if (order) {
          try {
                const receiptPdf = await generateReceiptPdf(order);
                const updatedStatus = String(req.body.status || '').toLowerCase();

                const mailResult = await sendTransactionUpdateEmail({
                    to: order.email,
                    subject: `KitKart Order #${order.id} Status Updated`,
                    html: `
                        <div style="margin:0;background:#f8fafc;padding:24px 0;font-family:Arial,sans-serif;color:#0f172a;">
                          <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;box-shadow:0 16px 40px rgba(15,23,42,0.08);">
                            <div style="background:linear-gradient(135deg,#0f766e,#14b8a6);padding:28px 32px;color:#ffffff;">
                              <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;opacity:.9;">KitKart</div>
                              <div style="font-size:28px;font-weight:700;margin-top:8px;">Order status updated</div>
                              <div style="font-size:14px;opacity:.95;margin-top:8px;">Order #${order.id} is now <strong>${req.body.status}</strong>.</div>
                            </div>

                            <div style="padding:32px;">
                              <p style="font-size:16px;line-height:1.6;margin:0 0 18px;">Hello ${order.first_name},</p>
                              <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 18px;">We’ve updated the status of your order and attached a polished PDF receipt for your records.</p>

                              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:18px 20px;margin:0 0 24px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                  <tr>
                                    <td style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Order</td>
                                    <td style="padding:6px 0;color:#0f172a;font-weight:700;text-align:right;">#${order.id}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Status</td>
                                    <td style="padding:6px 0;color:#0f172a;font-weight:700;text-align:right;">${req.body.status}</td>
                                  </tr>
                                  <tr>
                                    <td style="padding:6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Customer</td>
                                    <td style="padding:6px 0;color:#0f172a;font-weight:700;text-align:right;">${order.first_name} ${order.last_name}</td>
                                  </tr>
                                </table>
                              </div>

                              <div style="display:block;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:16px 18px;color:#9a3412;font-size:13px;line-height:1.6;">
                                Your receipt PDF is attached below. If you need help, reply to this email and we’ll take care of it.
                              </div>
                            </div>
                          </div>
                        </div>
                    `,
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

        res.json({

            success:true,
            message: emailStatus === 'sent'
                ? "Updated. Email receipt sent."
                : emailStatus === 'skipped'
                    ? "Updated. Email skipped because Mailtrap is not configured."
                    : "Updated. Email receipt could not be sent.",
            emailStatus

        });

    }

    catch(err){
        console.error('Error updating order status:', {
            itemId: req.params.itemId,
            error: err.message,
            stack: err.stack
        });

        res.status(err.statusCode || 500).json({

            success:false,
            message:err.message || 'Unable to update item status.'

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
