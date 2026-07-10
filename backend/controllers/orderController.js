const orderModel = require('../models/orderModel');
const { escapeHtml, money, renderPage } = require('../services/viewService');

function checkoutRows(items) {
  return items.map((item) => `
    <tr>
      <td>${escapeHtml(item.product_name)}</td>
      <td>PHP ${money(item.price)}</td>
      <td>${escapeHtml(item.quantity)}</td>
      <td>PHP ${money(item.subtotal)}</td>
    </tr>
  `).join('');
}

function paymentOptions(paymentMethods, selectedPaymentMethod) {
  return paymentMethods.map((method) => {
    const selected = selectedPaymentMethod === method ? 'selected' : '';
    return `<option value="${escapeHtml(method)}" ${selected}>${escapeHtml(method)}</option>`;
  }).join('');
}

function orderHistoryRows(orders) {
  return orders.map((order) => `
    <tr>
      <td>#${escapeHtml(order.id)}</td>
      <td>${escapeHtml(order.payment_method)}</td>
      <td>${escapeHtml(order.item_count)}</td>
      <td>PHP ${money(order.total)}</td>
      <td><a href="/orders/${escapeHtml(order.id)}">View</a></td>
    </tr>
  `).join('');
}

function orderDetailRows(order) {
  return order.items.map((item) => {
    let reviewAction = '<span class="muted">Available after delivery</span>';

    if (item.review_id) {
      reviewAction = `<a href="/reviews/${escapeHtml(item.review_id)}/edit">Edit review</a>`;
    } else if (item.status === 'Delivered') {
      reviewAction = `<a href="/shop/${escapeHtml(item.product_id)}">Write review</a>`;
    }

    return `
      <tr>
        <td>${escapeHtml(item.product_name)}</td>
        <td>PHP ${money(item.price)}</td>
        <td>${escapeHtml(item.quantity)}</td>
        <td>PHP ${money(item.subtotal)}</td>
        <td>${escapeHtml(item.status)}</td>
        <td>${reviewAction}</td>
      </tr>
    `;
  }).join('');
}

function cancelButton(order) {
  if (order.can_cancel) {
    return `
      <form action="/orders/${escapeHtml(order.id)}/cancel" method="POST" class="inline-form">
        <button type="submit" class="cancel-order-button">Cancel Order</button>
      </form>
    `;
  }

  return `
    <button type="button" class="cancel-order-button is-disabled" disabled>Cancel Order</button>
    <p class="muted">Cancel is only available while the order is still pending.</p>
  `;
}

async function checkoutPage(req, res) {
  try {
    const cart = await orderModel.getCheckoutCart(req.session.user.id);

    return renderPage(res, 'checkout', {
      title: 'Checkout',
      errorMessage: '',
      emptyMessage: cart.items.length === 0 ? '<p class="empty-message is-visible">Your cart is empty.</p><p><a href="/shop">Browse products</a></p>' : '',
      checkoutTable: cart.items.length === 0 ? '' : checkoutRows(cart.items),
      paymentOptions: paymentOptions(orderModel.PAYMENT_METHODS, 'Cash on Delivery'),
      total: money(cart.total),
      checkoutFormClass: cart.items.length === 0 ? 'is-hidden' : '',
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

    return renderPage(res, 'checkout', {
      title: 'Checkout',
      errorMessage: `<p class="form-error">${escapeHtml(error.message || 'Checkout failed.')}</p>`,
      emptyMessage: cart.items.length === 0 ? '<p class="empty-message is-visible">Your cart is empty.</p><p><a href="/shop">Browse products</a></p>' : '',
      checkoutTable: cart.items.length === 0 ? '' : checkoutRows(cart.items),
      paymentOptions: paymentOptions(orderModel.PAYMENT_METHODS, selectedPaymentMethod),
      total: money(cart.total),
      checkoutFormClass: cart.items.length === 0 ? 'is-hidden' : '',
    }, statusCode);
  }
}

async function confirmationPage(req, res) {
  try {
    const order = await orderModel.getOrderForUser(req.session.user.id, req.params.orderId);

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    return renderPage(res, 'order-confirmation', {
      title: 'Order Confirmed',
      orderId: order.id,
      paymentMethod: order.payment_method,
      total: money(order.total),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order confirmation.');
  }
}

async function orderHistory(req, res) {
  try {
    const orders = await orderModel.getOrdersForUser(req.session.user.id);

    return renderPage(res, 'order-history', {
      title: 'Order History',
      emptyMessage: orders.length === 0 ? '<p class="empty-message is-visible">No orders yet.</p>' : '',
      orderRows: orderHistoryRows(orders),
      tableClass: orders.length === 0 ? 'is-hidden' : '',
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

    return renderPage(res, 'order-show', {
      title: `Order #${order.id}`,
      orderId: order.id,
      paymentMethod: order.payment_method,
      orderRows: orderDetailRows(order),
      total: money(order.total),
      cancelButton: cancelButton(order),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load order details.');
  }
}

async function cancelOrder(req, res) {
  try {
    await orderModel.cancelOrderForUser(req.session.user.id, req.params.orderId);
    return res.redirect(`/orders/${req.params.orderId}`);
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).send(error.message || 'Unable to cancel order.');
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
  cancelOrder,
  checkoutPage,
  createOrder,
  getCheckout,
  getOrders,
  getSingleOrder,
  placeOrder,
  confirmationPage,
  orderHistory,
  orderDetails
};
