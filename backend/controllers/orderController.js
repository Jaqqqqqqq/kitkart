const orderModel = require('../models/orderModel');
const path = require('path');
const { buildOrderPlacedEmail, sendTransactionUpdateEmail } = require('../services/mailService');
const { generateReceiptPdf } = require('../services/receiptService');

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
    const wantsJson = req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) || (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') !== -1);
    if (wantsJson) {
      return res.status(201).json({ success: true, message: 'Order placed successfully', orderId });
    }

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
    const customerName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim();
    let emailStatus = 'sent';

    try {
      const receiptPdf = await generateReceiptPdf({
        orderId: order.id,
        createdAt: order.created_at,
        customerName,
        email: req.user.email,
        paymentMethod: order.payment_method,
        items: order.items,
      });

      const mailResult = await sendTransactionUpdateEmail({
        to: req.user.email,
        subject: `KitKart Order #${order.id} Confirmation`,
        html: buildOrderPlacedEmail({
          orderId: order.id,
          customerName,
          paymentMethod: order.payment_method,
          items: order.items,
        }),
        attachments: [
          {
            filename: `kitkart-order-${order.id}-receipt.pdf`,
            content: receiptPdf,
            contentType: 'application/pdf',
          },
        ],
      });

      emailStatus = mailResult?.skipped ? 'skipped' : 'sent';
    } catch (mailError) {
      emailStatus = 'failed';
      console.error('Unable to send order receipt email:', mailError);
    }

    return res.status(201).json({
      success: true,
      message: emailStatus === 'sent'
        ? 'Order placed successfully. Receipt email sent.'
        : emailStatus === 'skipped'
          ? 'Order placed successfully. Email skipped because Mailtrap is not configured.'
          : 'Order placed successfully. Receipt email could not be sent.',
      emailStatus,
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
