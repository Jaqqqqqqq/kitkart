const cartModel = require('../models/cartModel');

function wantsJson(req) {
  return req.xhr || req.headers.accept?.includes('application/json');
}

function cartResponse(cartData, message = null) {
  return {
    success: true,
    message,
    items: cartData.items,
    total: cartData.total,
    itemCount: cartData.items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

function handleCartError(req, res, error) {
  const statusCode = error.statusCode || 500;

  if (statusCode === 500) {
    console.error(error);
  }

  if (wantsJson(req)) {
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Cart update failed.',
    });
  }

  return res.status(statusCode).send(error.message || 'Cart update failed.');
}

async function showCart(req, res) {
  try {
    const cartData = await cartModel.getCartContents(req.session.user.id);

    res.render('cart/index', {
      title: 'My Cart',
      items: cartData.items,
      total: cartData.total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to load cart.');
  }
}

async function addItem(req, res) {
  try {
    const cartData = await cartModel.addItem(
      req.session.user.id,
      req.body.product_id,
      req.body.quantity
    );

    if (wantsJson(req)) {
      return res.json(cartResponse(cartData, 'Product added to cart.'));
    }

    return res.redirect('/cart');
  } catch (error) {
    return handleCartError(req, res, error);
  }
}

async function increaseItem(req, res) {
  try {
    const cartData = await cartModel.increaseItem(req.session.user.id, req.params.itemId);
    return res.json(cartResponse(cartData));
  } catch (error) {
    return handleCartError(req, res, error);
  }
}

async function decreaseItem(req, res) {
  try {
    const cartData = await cartModel.decreaseItem(req.session.user.id, req.params.itemId);
    return res.json(cartResponse(cartData));
  } catch (error) {
    return handleCartError(req, res, error);
  }
}

async function removeItem(req, res) {
  try {
    const cartData = await cartModel.removeItem(req.session.user.id, req.params.itemId);
    return res.json(cartResponse(cartData));
  } catch (error) {
    return handleCartError(req, res, error);
  }
}

module.exports = {
  showCart,
  addItem,
  increaseItem,
  decreaseItem,
  removeItem,
};
