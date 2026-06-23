const adminModel = require('../models/adminModel');

function productFormDefaults(product = {}) {
  return {
    category_id: product.category_id || '',
    product_name: product.product_name || '',
    description: product.description || '',
    price: product.price ?? '',
    stock_quantity: product.stock_quantity ?? '',
    image: product.image || '',
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
    await adminModel.createProduct(req.body);
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
    await adminModel.updateProduct(req.params.id, req.body);
    return res.redirect('/admin/products');
  } catch (error) {
    const categories = await adminModel.getCategories();

    return res.status(error.statusCode || 500).render('admin/products/form', {
      title: 'Edit Product',
      action: `/admin/products/${req.params.id}`,
      product: productFormDefaults({ ...req.body, id: req.params.id }),
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

module.exports = {
  categories,
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  editCategory,
  editProduct,
  newCategory,
  newProduct,
  orderDetails,
  orders,
  products,
  updateCategory,
  updateProduct,
  users,
};
