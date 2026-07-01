const { pool } = require('../config/db');
const { Category, Product, User } = require('../config/sequelize');

function normalizeProductInput(input) {
  return {
    category_id: Number(input.category_id),
    product_name: String(input.product_name || '').trim(),
    description: String(input.description || '').trim() || null,
    price: Number(input.price),
    stock_quantity: Number(input.stock_quantity),
    image: String(input.image || '').trim() || null,
  };
}

function normalizeCategoryInput(input) {
  return {
    category_name: String(input.category_name || '').trim(),
    description: String(input.description || '').trim() || null,
  };
}

function validateProduct(product) {
  if (!product.category_id || !product.product_name || Number.isNaN(product.price) || Number.isNaN(product.stock_quantity)) {
    return 'Please fill in all required product fields.';
  }

  if (product.price < 0 || product.stock_quantity < 0) {
    return 'Price and stock quantity cannot be negative.';
  }

  return null;
}

function validateCategory(category) {
  if (!category.category_name) {
    return 'Please enter a category name.';
  }

  return null;
}

async function getAllOrders() {
  const [orders] = await pool.execute(
    `SELECT
       o.id,
       o.payment_method,
       o.order_status,
       o.created_at,
       u.first_name,
       u.last_name,
       u.email,
       COALESCE(SUM(oi.quantity * oi.price), 0) AS total,
       COUNT(oi.id) AS item_count
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     LEFT JOIN order_items oi ON oi.order_id = o.id
     GROUP BY o.id, o.payment_method, o.order_status, o.created_at, u.first_name, u.last_name, u.email
     ORDER BY o.created_at DESC, o.id DESC`
  );

  return orders.map((order) => ({
    ...order,
    total: Number(order.total),
    item_count: Number(order.item_count),
  }));
}

async function getOrderById(orderId) {
  const [orders] = await pool.execute(
    `SELECT
       o.id,
       o.payment_method,
       o.order_status,
       o.created_at,
       u.first_name,
       u.last_name,
       u.email
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     WHERE o.id = ?
     LIMIT 1`,
    [orderId]
  );

  if (orders.length === 0) {
    return null;
  }

  const [items] = await pool.execute(
    `SELECT
       oi.product_id,
       oi.quantity,
       oi.price,
       p.product_name
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY p.product_name ASC`,
    [orderId]
  );

  const normalizedItems = items.map((item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    return {
      ...item,
      price,
      quantity,
      subtotal: price * quantity,
    };
  });

  return {
    ...orders[0],
    items: normalizedItems,
    total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

async function getProducts() {
  const products = await Product.findAll({
    include: [{ model: Category, attributes: ['category_name'] }],
    order: [['product_name', 'ASC']],
  });

  return products.map((product) => ({
    ...product.get({ plain: true }),
    category_name: product.Category.category_name,
    price: Number(product.price),
    stock_quantity: Number(product.stock_quantity),
  }));
}

async function getProductById(productId) {
  const product = await Product.findByPk(productId);

  if (!product) {
    return null;
  }

  const plainProduct = product.get({ plain: true });

  return {
    ...plainProduct,
    price: Number(plainProduct.price),
    stock_quantity: Number(plainProduct.stock_quantity),
  };
}

async function createProduct(input) {
  const product = normalizeProductInput(input);
  const error = validateProduct(product);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await Product.create(product);
}

async function updateProduct(productId, input) {
  const product = normalizeProductInput(input);
  const error = validateProduct(product);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await Product.update(product, { where: { id: productId } });
}

async function deleteProduct(productId) {
  await Product.destroy({ where: { id: productId } });
}

async function getCategories() {
  const categories = await Category.findAll({ order: [['category_name', 'ASC']] });

  return categories.map((category) => category.get({ plain: true }));
}

async function getCategoryById(categoryId) {
  const category = await Category.findByPk(categoryId);

  return category ? category.get({ plain: true }) : null;
}

async function createCategory(input) {
  const category = normalizeCategoryInput(input);
  const error = validateCategory(category);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await Category.create(category);
}

async function updateCategory(categoryId, input) {
  const category = normalizeCategoryInput(input);
  const error = validateCategory(category);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await Category.update(category, { where: { id: categoryId } });
}

async function deleteCategory(categoryId) {
  await Category.destroy({ where: { id: categoryId } });
}

async function getUsers() {
  const users = await User.findAll({
    attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone', 'address', 'created_at'],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return users.map((user) => user.get({ plain: true }));
}

async function updateUserRole(userId, role) {
  if (!['admin', 'customer'].includes(role)) {
    const error = new Error('Please select a valid role.');
    error.statusCode = 400;
    throw error;
  }

  await User.update({ role }, { where: { id: userId } });
}

async function updateUserStatus(userId, status) {
  if (!['active', 'inactive'].includes(status)) {
    const error = new Error('Please select a valid status.');
    error.statusCode = 400;
    throw error;
  }

  await User.update({ status }, { where: { id: userId } });
}

module.exports = {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getAllOrders,
  getCategories,
  getCategoryById,
  getOrderById,
  getProductById,
  getProducts,
  getUsers,
  updateCategory,
  updateProduct,
  updateUserRole,
  updateUserStatus,
};
