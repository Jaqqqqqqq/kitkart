const { Cart, CartItem, Product } = require('../config/sequelize');

async function getOrCreateCart(userId) {
  const [cart] = await Cart.findOrCreate({
    where: { user_id: userId },
    defaults: { user_id: userId },
  });

  return cart.get({ plain: true });
}

function normalizeCartItems(items) {
  return items.map((item) => {
    const plainItem = item.get ? item.get({ plain: true }) : item;
    const product = plainItem.Product;
    const price = Number(product.price);
    const quantity = Number(plainItem.quantity);

    return {
      cart_item_id: plainItem.id,
      quantity,
      product_id: product.id,
      product_name: product.product_name,
      price,
      stock_quantity: product.stock_quantity,
      subtotal: price * quantity,
    };
  });
}

async function getCartContents(userId) {
  const cart = await getOrCreateCart(userId);
  const items = await CartItem.findAll({
    where: { cart_id: cart.id },
    include: [{ model: Product }],
  });

  const normalizedItems = normalizeCartItems(items).sort((a, b) => a.product_name.localeCompare(b.product_name));

  return {
    cart,
    items: normalizedItems,
    total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

async function addItem(userId, productId, quantity = 1) {
  const requestedQuantity = Math.max(Number(quantity) || 1, 1);
  const cart = await getOrCreateCart(userId);
  const product = await Product.findByPk(productId);

  if (!product) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const stockQuantity = Number(product.stock_quantity) || 0;

  if (stockQuantity < 1) {
    const error = new Error('This product is out of stock.');
    error.statusCode = 400;
    throw error;
  }

  const existingItem = await CartItem.findOne({
    where: {
      cart_id: cart.id,
      product_id: productId,
    },
  });

  const currentQuantity = existingItem ? Number(existingItem.quantity) : 0;
  const nextQuantity = currentQuantity + requestedQuantity;

  if (nextQuantity > stockQuantity) {
    const error = new Error(`Only ${stockQuantity} item(s) available in stock.`);
    error.statusCode = 400;
    throw error;
  }

  if (existingItem) {
    await existingItem.update({ quantity: nextQuantity });
  } else {
    await CartItem.create({
      cart_id: cart.id,
      product_id: productId,
      quantity: requestedQuantity,
    });
  }

  return getCartContents(userId);
}

async function getCartItemForUser(userId, cartItemId) {
  const item = await CartItem.findOne({
    where: { id: cartItemId },
    include: [
      { model: Cart, where: { user_id: userId } },
      { model: Product, attributes: ['stock_quantity'] },
    ],
  });

  if (!item) {
    const error = new Error('Cart item not found.');
    error.statusCode = 404;
    throw error;
  }

  const plainItem = item.get({ plain: true });
  return {
    id: plainItem.id,
    quantity: plainItem.quantity,
    stock_quantity: plainItem.Product.stock_quantity,
  };
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

  await CartItem.update({ quantity: nextQuantity }, { where: { id: cartItemId } });

  return getCartContents(userId);
}

async function decreaseItem(userId, cartItemId) {
  const item = await getCartItemForUser(userId, cartItemId);
  const nextQuantity = Number(item.quantity) - 1;

  if (nextQuantity < 1) {
    await removeItem(userId, cartItemId);
  } else {
    await CartItem.update({ quantity: nextQuantity }, { where: { id: cartItemId } });
  }

  return getCartContents(userId);
}

async function removeItem(userId, cartItemId) {
  await getCartItemForUser(userId, cartItemId);
  await CartItem.destroy({ where: { id: cartItemId } });

  return getCartContents(userId);
}

module.exports = {
  getCartContents,
  addItem,
  increaseItem,
  decreaseItem,
  removeItem,
};
