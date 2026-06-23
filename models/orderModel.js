const { pool } = require('../config/db');

const PAYMENT_METHODS = ['Cash on Delivery', 'GCash', 'PayMaya', 'Credit Card'];

function normalizeOrderItems(items) {
  return items.map((item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    return {
      ...item,
      price,
      quantity,
      subtotal: price * quantity,
    };
  });
}

function getOrderTotal(items) {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

async function getCheckoutCart(userId) {
  const [items] = await pool.execute(
    `SELECT
       ci.id AS cart_item_id,
       ci.quantity,
       p.id AS product_id,
       p.product_name,
       p.price,
       p.stock_quantity
     FROM carts c
     INNER JOIN cart_items ci ON ci.cart_id = c.id
     INNER JOIN products p ON p.id = ci.product_id
     WHERE c.user_id = ?
     ORDER BY p.product_name ASC`,
    [userId]
  );

  const normalizedItems = normalizeOrderItems(items);

  return {
    items: normalizedItems,
    total: getOrderTotal(normalizedItems),
  };
}

async function createOrderFromCart(userId, paymentMethod) {
  if (!PAYMENT_METHODS.includes(paymentMethod)) {
    const error = new Error('Please select a valid payment method.');
    error.statusCode = 400;
    throw error;
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [cartItems] = await connection.execute(
      `SELECT
         c.id AS cart_id,
         ci.product_id,
         ci.quantity,
         p.product_name,
         p.price,
         p.stock_quantity
       FROM carts c
       INNER JOIN cart_items ci ON ci.cart_id = c.id
       INNER JOIN products p ON p.id = ci.product_id
       WHERE c.user_id = ?
       FOR UPDATE`,
      [userId]
    );

    if (cartItems.length === 0) {
      const error = new Error('Your cart is empty.');
      error.statusCode = 400;
      throw error;
    }

    for (const item of cartItems) {
      if (Number(item.quantity) > Number(item.stock_quantity)) {
        const error = new Error(`${item.product_name} only has ${item.stock_quantity} item(s) available.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, payment_method, order_status)
       VALUES (?, ?, 'Pending')`,
      [userId, paymentMethod]
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );

      await connection.execute(
        `UPDATE products
         SET stock_quantity = stock_quantity - ?
         WHERE id = ?`,
        [item.quantity, item.product_id]
      );
    }

    await connection.execute(
      `DELETE ci
       FROM cart_items ci
       INNER JOIN carts c ON c.id = ci.cart_id
       WHERE c.user_id = ?`,
      [userId]
    );

    await connection.commit();

    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function getOrdersForUser(userId) {
  const [orders] = await pool.execute(
    `SELECT
       o.id,
       o.payment_method,
       o.order_status,
       o.created_at,
       COALESCE(SUM(oi.quantity * oi.price), 0) AS total,
       COUNT(oi.id) AS item_count
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ?
     GROUP BY o.id, o.payment_method, o.order_status, o.created_at
     ORDER BY o.created_at DESC, o.id DESC`,
    [userId]
  );

  return orders.map((order) => ({
    ...order,
    total: Number(order.total),
    item_count: Number(order.item_count),
  }));
}

async function getOrderForUser(userId, orderId) {
  const [orders] = await pool.execute(
    `SELECT id, payment_method, order_status, created_at
     FROM orders
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [orderId, userId]
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

  const normalizedItems = normalizeOrderItems(items);

  return {
    ...orders[0],
    items: normalizedItems,
    total: getOrderTotal(normalizedItems),
  };
}

module.exports = {
  PAYMENT_METHODS,
  getCheckoutCart,
  createOrderFromCart,
  getOrdersForUser,
  getOrderForUser,
};
