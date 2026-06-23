const { pool } = require('../config/db');

async function getOrCreateCart(userId) {
  const [carts] = await pool.execute(
    'SELECT id FROM carts WHERE user_id = ? ORDER BY id ASC LIMIT 1',
    [userId]
  );

  if (carts.length > 0) {
    return carts[0];
  }

  const [result] = await pool.execute('INSERT INTO carts (user_id) VALUES (?)', [userId]);

  return {
    id: result.insertId,
  };
}

async function getCartContents(userId) {
  const cart = await getOrCreateCart(userId);
  const [items] = await pool.execute(
    `SELECT
       ci.id AS cart_item_id,
       ci.quantity,
       p.id AS product_id,
       p.product_name,
       p.price,
       p.stock_quantity
     FROM cart_items ci
     INNER JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?
     ORDER BY p.product_name ASC`,
    [cart.id]
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
    cart,
    items: normalizedItems,
    total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

async function addItem(userId, productId, quantity = 1) {
  const requestedQuantity = Math.max(Number(quantity) || 1, 1);
  const cart = await getOrCreateCart(userId);

  const [products] = await pool.execute(
    'SELECT id, stock_quantity FROM products WHERE id = ? LIMIT 1',
    [productId]
  );

  if (products.length === 0) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const stockQuantity = Number(products[0].stock_quantity) || 0;

  if (stockQuantity < 1) {
    const error = new Error('This product is out of stock.');
    error.statusCode = 400;
    throw error;
  }

  const [existingItems] = await pool.execute(
    'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? LIMIT 1',
    [cart.id, productId]
  );

  const currentQuantity = existingItems.length > 0 ? Number(existingItems[0].quantity) : 0;
  const nextQuantity = currentQuantity + requestedQuantity;

  if (nextQuantity > stockQuantity) {
    const error = new Error(`Only ${stockQuantity} item(s) available in stock.`);
    error.statusCode = 400;
    throw error;
  }

  if (existingItems.length > 0) {
    await pool.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', [
      nextQuantity,
      existingItems[0].id,
    ]);
  } else {
    await pool.execute(
      'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)',
      [cart.id, productId, requestedQuantity]
    );
  }

  return getCartContents(userId);
}

async function getCartItemForUser(userId, cartItemId) {
  const [items] = await pool.execute(
    `SELECT
       ci.id,
       ci.quantity,
       p.stock_quantity
     FROM cart_items ci
     INNER JOIN carts c ON c.id = ci.cart_id
     INNER JOIN products p ON p.id = ci.product_id
     WHERE ci.id = ? AND c.user_id = ?
     LIMIT 1`,
    [cartItemId, userId]
  );

  if (items.length === 0) {
    const error = new Error('Cart item not found.');
    error.statusCode = 404;
    throw error;
  }

  return items[0];
}

async function increaseItem(userId, cartItemId) {
  const item = await getCartItemForUser(userId, cartItemId);
  const nextQuantity = Number(item.quantity) + 1;
  const stockQuantity = Number(item.stock_quantity) || 0;

  if (nextQuantity > stockQuantity) {
    const error = new Error(`Only ${stockQuantity} item(s) available in stock.`);
    error.statusCode = 400;
    throw error;
  }

  await pool.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', [nextQuantity, cartItemId]);

  return getCartContents(userId);
}

async function decreaseItem(userId, cartItemId) {
  const item = await getCartItemForUser(userId, cartItemId);
  const nextQuantity = Number(item.quantity) - 1;

  if (nextQuantity < 1) {
    await removeItem(userId, cartItemId);
  } else {
    await pool.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', [nextQuantity, cartItemId]);
  }

  return getCartContents(userId);
}

async function removeItem(userId, cartItemId) {
  await getCartItemForUser(userId, cartItemId);
  await pool.execute('DELETE FROM cart_items WHERE id = ?', [cartItemId]);

  return getCartContents(userId);
}

module.exports = {
  getCartContents,
  addItem,
  increaseItem,
  decreaseItem,
  removeItem,
};
