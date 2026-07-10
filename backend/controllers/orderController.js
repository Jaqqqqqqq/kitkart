const orderModel = require('../models/orderModel');
const path = require('path');

async function checkoutPage(req, res) {
  try {
    res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'checkout.html'));
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

    return res.status(statusCode).send(error.message || 'Checkout failed.');
  }
}

async function confirmationPage(req, res) {
  try {
    const order = await orderModel.getOrderForUser(req.session.user.id, req.params.orderId);

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'order-confirmation.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order confirmation.');
  }
}

async function orderHistory(req, res) {
  try {
    res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'order-history.html'));
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to load order history.');
  }
}

async function orderDetails(req, res) {
  try {
    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'order-show.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order details.');
  }
}

async function cancelOrder(req, res) {
  try {
    await orderModel.cancelOrderForUser(req.session.user.id, req.params.orderId);
    return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully.',
    });
  } catch (error) {
    return handleApiError(res, error, 'Unable to cancel order.');
  }
}

function handleApiError(res, error, fallbackMessage) {
  console.log(error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
  });
}

async function getCheckout(req, res) {
  try {
    const checkout = await orderModel.getCheckoutCart(req.user.id);

    return res.status(200).json({
      success: true,
      result: checkout,
      paymentMethods: orderModel.PAYMENT_METHODS,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error fetching checkout');
  }
}

async function createOrder(req, res) {
  try {
    const orderId = await orderModel.createOrderFromCart(req.user.id, req.body.payment_method);
    const order = await orderModel.getOrderForUser(req.user.id, orderId);

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      result: order,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error creating order');
  }
}

async function getOrders(req, res) {
  try {
    const orders = await orderModel.getOrdersForUser(req.user.id);

    return res.status(200).json({
      success: true,
      rows: orders,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error fetching orders');
  }
}

async function getSingleOrder(req, res) {
  try {
    const order = await orderModel.getOrderForUser(req.user.id, req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.status(200).json({
      success: true,
      result: order,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error fetching order');
  }
}

module.exports = {
  checkoutPage,
  createOrder,
  getCheckout,
  getOrders,
  getSingleOrder,
  cancelOrder,
  placeOrder,
  confirmationPage,
  orderHistory,
  orderDetails
};
