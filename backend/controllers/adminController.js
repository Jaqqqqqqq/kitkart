const adminModel = require('../models/adminModel');
const reviewModel = require('../models/reviewModel');
const db = require('../models');
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

function getUploadedFile(req, fieldName) {
  if (Array.isArray(req.files)) {
    return req.files.find((file) => file.fieldname === fieldName) || null;
  }

  return req.files?.[fieldName]?.[0] || null;
}

function getUploadedFilenames(req, fieldName) {
  if (Array.isArray(req.files)) {
    return req.files
      .filter((file) => file.fieldname === fieldName)
      .map((file) => file.filename);
  }

  return (req.files?.[fieldName] || []).map((file) => file.filename);
}

function getProductUploadOptions(req) {
  return {
    mainImage: getUploadedFile(req, 'main_image')?.filename || null,
    galleryImages: getUploadedFilenames(req, 'gallery_images').slice(0, 8),
  };
}

function categoryFormDefaults(category = {}) {
  return {
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

async function createProduct(req, res) {
  try {
    await adminModel.createProduct(req.body, getProductUploadOptions(req));
    return res.redirect('/admin/products');
  } catch (error) {
    const categories = await adminModel.getCategories();

    return res.status(error.statusCode || 500).render('admin/products/form', {
      title: 'Add Product',
      action: '/admin/products',
      product: productFormDefaults(req.body),
      categories,
      error: error.message || 'Unable to create product.',
    });
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

async function updateProduct(req, res) {
  try {
    await adminModel.updateProduct(req.params.id, req.body, getProductUploadOptions(req));
    return res.redirect('/admin/products');
  } catch (error) {
    const [categories, existingProduct] = await Promise.all([
      adminModel.getCategories(),
      adminModel.getProductById(req.params.id),
    ]);

    return res.status(error.statusCode || 500).render('admin/products/form', {
      title: 'Edit Product',
      action: `/admin/products/${req.params.id}`,
      product: productFormDefaults({ ...(existingProduct || {}), ...req.body, id: req.params.id }),
      categories,
      error: error.message || 'Unable to update product.',
    });
  }
}

async function deleteProduct(req, res) {
  try {
    await adminModel.deleteProduct(req.params.id);
    return res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to delete product.');
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

async function createCategory(req, res) {
  try {
    await adminModel.createCategory(req.body);
    return res.redirect('/admin/categories');
  } catch (error) {
    return renderCategoryForm(
      res,
      'Add Category',
      '/admin/categories',
      req.body,
      error.message || 'Unable to create category.',
      error.statusCode || 500
    );
  }
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

async function updateCategory(req, res) {
  try {
    await adminModel.updateCategory(req.params.id, req.body);
    return res.redirect('/admin/categories');
  } catch (error) {
    return renderCategoryForm(
      res,
      'Edit Category',
      `/admin/categories/${req.params.id}`,
      req.body,
      error.message || 'Unable to update category.',
      error.statusCode || 500
    );
  }
}

async function deleteCategory(req, res) {
  try {
    await adminModel.deleteCategory(req.params.id);
    return res.redirect('/admin/categories');
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to delete category.');
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
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error creating category' });
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
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error updating category' });
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
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error deleting category' });
  }
}

async function updateOrderItemStatus(req,res){

    try{

        await adminModel.updateOrderItemStatus(

            req.params.itemId,
            req.body.status

        );

        res.json({

            success:true,
            message:"Updated."

        });

    }

    catch(err){

        res.status(err.statusCode || 500).json({

            success:false,
            message:err.message || 'Unable to update item status.'

        });

    }

}

module.exports = {
  categories,
  createCategoryApi,
  createCategory,
  createProduct,
  deleteCategory,
  deleteCategoryApi,
  deleteProduct,
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
  updateCategory,
  updateCategoryApi,
  updateProduct,
  updateUserRole,
  updateUserStatus,
  users,
  updateOrderItemStatus
};
