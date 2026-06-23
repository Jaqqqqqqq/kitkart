const orderModel = require('../models/orderModel');

async function checkoutPage(req, res) {
  try {
    const cart = await orderModel.getCheckoutCart(req.session.user.id);

    res.render('orders/checkout', {
      title: 'Checkout',
      items: cart.items,
      total: cart.total,
      paymentMethods: orderModel.PAYMENT_METHODS,
      error: null,
      selectedPaymentMethod: 'Cash on Delivery',
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to load checkout.');
  }
}

async function placeOrder(req, res) {
  const selectedPaymentMethod = req.body.payment_method;

  try {
    const orderId = await orderModel.createOrderFromCart(req.session.user.id, selectedPaymentMethod);
    return res.redirect(`/orders/${orderId}/confirmation`);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error(error);
    }

    const cart = await orderModel.getCheckoutCart(req.session.user.id);

    return res.status(statusCode).render('orders/checkout', {
      title: 'Checkout',
      items: cart.items,
      total: cart.total,
      paymentMethods: orderModel.PAYMENT_METHODS,
      error: error.message || 'Checkout failed.',
      selectedPaymentMethod,
    });
  }
}

async function confirmationPage(req, res) {
  try {
    const order = await orderModel.getOrderForUser(req.session.user.id, req.params.orderId);

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    return res.render('orders/confirmation', {
      title: 'Order Confirmed',
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order confirmation.');
  }
}

async function orderHistory(req, res) {
  try {
    const orders = await orderModel.getOrdersForUser(req.session.user.id);

    res.render('orders/history', {
      title: 'Order History',
      orders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to load order history.');
  }
}

async function orderDetails(req, res) {
  try {
    const order = await orderModel.getOrderForUser(req.session.user.id, req.params.orderId);

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    return res.render('orders/show', {
      title: `Order #${order.id}`,
      order,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order details.');
  }
}

module.exports = {
  checkoutPage,
  placeOrder,
  confirmationPage,
  orderHistory,
  orderDetails,
};
