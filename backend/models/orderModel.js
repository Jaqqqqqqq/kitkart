const { Cart, CartItem, Order, OrderItem, Product, Review, sequelize } = require('../config/sequelize');

const PAYMENT_METHODS = ['Cash on Delivery', 'GCash', 'PayMaya', 'Credit Card'];

function normalizeOrderItems(items) {
  return items.map((item) => {
    const plainItem = item.get ? item.get({ plain: true }) : item;
    const product = plainItem.Product || {};
    const price = Number(plainItem.price ?? product.price);
    const quantity = Number(plainItem.quantity);

    return {
      id: plainItem.id,
      product_id: plainItem.product_id || product.id,
      quantity,
      price,
      status: plainItem.status,
      product_name: product.product_name,
      subtotal: price * quantity,
    };
  });
}

function getOrderTotal(items) {
  return items.reduce((sum, item) => sum + item.subtotal, 0);
}

async function getCheckoutCart(userId) {
  const cart = await Cart.findOne({ where: { user_id: userId } });

  if (!cart) {
    return { items: [], total: 0 };
  }

  const items = await CartItem.findAll({
    where: { cart_id: cart.id },
    include: [{ model: Product }],
  });

  const normalizedItems = items
    .map((item) => {
      const plainItem = item.get({ plain: true });
      const price = Number(plainItem.Product.price);
      const quantity = Number(plainItem.quantity);

      return {
        cart_item_id: plainItem.id,
        quantity,
        product_id: plainItem.Product.id,
        product_name: plainItem.Product.product_name,
        price,
        stock_quantity: plainItem.Product.stock_quantity,
        subtotal: price * quantity,
      };
    })
    .sort((a, b) => a.product_name.localeCompare(b.product_name));

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

  return sequelize.transaction(async (transaction) => {
    const cart = await Cart.findOne({ where: { user_id: userId }, transaction });

    if (!cart) {
      const error = new Error('Your cart is empty.');
      error.statusCode = 400;
      throw error;
    }

    const cartItems = await CartItem.findAll({
      where: { cart_id: cart.id },
      include: [{ model: Product }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (cartItems.length === 0) {
      const error = new Error('Your cart is empty.');
      error.statusCode = 400;
      throw error;
    }

    for (const cartItem of cartItems) {
      const plainItem = cartItem.get({ plain: true });

      if (Number(plainItem.quantity) > Number(plainItem.Product.stock_quantity)) {
        const error = new Error(`${plainItem.Product.product_name} only has ${plainItem.Product.stock_quantity} item(s) available.`);
        error.statusCode = 400;
        throw error;
      }
    }

    const order = await Order.create(
      {
        user_id: userId,
        payment_method: paymentMethod,
      },
      { transaction }
    );

    for (const cartItem of cartItems) {
      const plainItem = cartItem.get({ plain: true });

      await OrderItem.create(
        {
          order_id: order.id,
          product_id: plainItem.product_id,
          quantity: plainItem.quantity,
          price: plainItem.Product.price,
          status: 'Pending',
        },
        { transaction }
      );

      await Product.decrement('stock_quantity', {
        by: Number(plainItem.quantity),
        where: { id: plainItem.product_id },
        transaction,
      });
    }

    await CartItem.destroy({ where: { cart_id: cart.id }, transaction });

    return order.id;
  });
}

async function getOrdersForUser(userId) {
  const orders = await Order.findAll({
    where: { user_id: userId },
    include: [{ model: OrderItem, attributes: ['id', 'quantity', 'price'] }],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return orders.map((order) => {
    const plainOrder = order.get({ plain: true });
    const items = plainOrder.OrderItems || [];

    return {
      id: plainOrder.id,
      payment_method: plainOrder.payment_method,
      created_at: plainOrder.created_at,
      total: items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0),
      item_count: items.length,
    };
  });
}

async function getOrderForUser(userId, orderId) {
  const order = await Order.findOne({
    where: { id: orderId, user_id: userId },
    include: [
      {
        model: OrderItem,
        include: [{ model: Product, attributes: ['product_name'] }],
      },
    ],
  });

  if (!order) {
    return null;
  }

  const plainOrder = order.get({ plain: true });
  const normalizedItems = normalizeOrderItems(plainOrder.OrderItems || [])
    .sort((a, b) => a.product_name.localeCompare(b.product_name));
  const productIds = normalizedItems.map((item) => item.product_id);
  const reviews = await Review.findAll({
    where: {
      user_id: userId,
      order_id: plainOrder.id,
      product_id: productIds,
    },
    attributes: ['id', 'product_id'],
  });
  const reviewByProductId = new Map(
    reviews.map((review) => {
      const item = review.get({ plain: true });
      return [Number(item.product_id), item.id];
    })
  );

  return {
    id: plainOrder.id,
    payment_method: plainOrder.payment_method,
    created_at: plainOrder.created_at,
    items: normalizedItems.map((item) => ({
      ...item,
      review_id: reviewByProductId.get(Number(item.product_id)) || null,
    })),
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
