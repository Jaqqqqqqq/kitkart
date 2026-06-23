const { pool } = require('../config/db');

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
  const [products] = await pool.execute(
    `SELECT
       p.id,
       p.category_id,
       p.product_name,
       p.description,
       p.price,
       p.stock_quantity,
       p.image,
       c.category_name
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     ORDER BY p.product_name ASC`
  );

  return products.map((product) => ({
    ...product,
    price: Number(product.price),
    stock_quantity: Number(product.stock_quantity),
  }));
}

async function getProductById(productId) {
  const [products] = await pool.execute(
    `SELECT id, category_id, product_name, description, price, stock_quantity, image
     FROM products
     WHERE id = ?
     LIMIT 1`,
    [productId]
  );

  if (products.length === 0) {
    return null;
  }

  return {
    ...products[0],
    price: Number(products[0].price),
    stock_quantity: Number(products[0].stock_quantity),
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

  await pool.execute(
    `INSERT INTO products (category_id, product_name, description, price, stock_quantity, image)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [product.category_id, product.product_name, product.description, product.price, product.stock_quantity, product.image]
  );
}

async function updateProduct(productId, input) {
  const product = normalizeProductInput(input);
  const error = validateProduct(product);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await pool.execute(
    `UPDATE products
     SET category_id = ?, product_name = ?, description = ?, price = ?, stock_quantity = ?, image = ?
     WHERE id = ?`,
    [product.category_id, product.product_name, product.description, product.price, product.stock_quantity, product.image, productId]
  );
}

async function deleteProduct(productId) {
  await pool.execute('DELETE FROM products WHERE id = ?', [productId]);
}

async function getCategories() {
  const [categories] = await pool.execute(
    `SELECT id, category_name, description, created_at
     FROM categories
     ORDER BY category_name ASC`
  );

  return categories;
}

async function getCategoryById(categoryId) {
  const [categories] = await pool.execute(
    `SELECT id, category_name, description
     FROM categories
     WHERE id = ?
     LIMIT 1`,
    [categoryId]
  );

  return categories[0] || null;
}

async function createCategory(input) {
  const category = normalizeCategoryInput(input);
  const error = validateCategory(category);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await pool.execute(
    `INSERT INTO categories (category_name, description)
     VALUES (?, ?)`,
    [category.category_name, category.description]
  );
}

async function updateCategory(categoryId, input) {
  const category = normalizeCategoryInput(input);
  const error = validateCategory(category);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await pool.execute(
    `UPDATE categories
     SET category_name = ?, description = ?
     WHERE id = ?`,
    [category.category_name, category.description, categoryId]
  );
}

async function deleteCategory(categoryId) {
  await pool.execute('DELETE FROM categories WHERE id = ?', [categoryId]);
}

async function getUsers() {
  const [users] = await pool.execute(
    `SELECT id, first_name, last_name, email, role, status, phone, address, created_at
     FROM users
     ORDER BY created_at DESC, id DESC`
  );

  return users;
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
};
