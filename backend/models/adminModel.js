const { Category, Order, OrderItem, Product, ProductImage, User } = require('../config/sequelize');

const ORDER_ITEM_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled'];

function normalizeProductInput(input, mainImage = null) {
  return {
    category_id: Number(input.category_id),
    product_name: String(input.product_name || '').trim(),
    description: String(input.description || '').trim() || null,
    price: Number(input.price),
    stock_quantity: Number(input.stock_quantity),
    image: mainImage || null,
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
  const orders = await Order.findAll({
    include: [
      { model: User, attributes: ['first_name', 'last_name', 'email'] },
      { model: OrderItem, attributes: ['id', 'quantity', 'price'] },
    ],
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
      first_name: plainOrder.User.first_name,
      last_name: plainOrder.User.last_name,
      email: plainOrder.User.email,
      total: items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0),
      item_count: items.length,
    };
  });
}

async function getOrderById(orderId) {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, attributes: ['first_name', 'last_name', 'email'] },
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
  const normalizedItems = (plainOrder.OrderItems || []).map((item) => {
    const price = Number(item.price);
    const quantity = Number(item.quantity);

    return {
      ...item,
      price,
      quantity,
      subtotal: price * quantity,
      product_name: item.Product.product_name,
    };
  }).sort((a, b) => a.product_name.localeCompare(b.product_name));

  return {
    id: plainOrder.id,
    payment_method: plainOrder.payment_method,
    created_at: plainOrder.created_at,
    first_name: plainOrder.User.first_name,
    last_name: plainOrder.User.last_name,
    email: plainOrder.User.email,
    items: normalizedItems,
    total: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
  };
}

async function getOrderByItemId(itemId) {
  const orderItem = await OrderItem.findByPk(itemId, {
    attributes: ['order_id'],
  });

  if (!orderItem) {
    return null;
  }

  return getOrderById(orderItem.order_id);
}

async function getProducts() {
  const products = await Product.findAll({
    include: [{ model: Category, attributes: ['category_name'] }],
    order: [['product_name', 'ASC']],
  });

  return products.map((product) => ({
    ...product.get({ plain: true }),
    category_name: product.Category.category_name,
    price: Number(product.price),
    stock_quantity: Number(product.stock_quantity),
  }));
}

async function getProductById(productId) {
  const product = await Product.findByPk(productId);

  if (!product) {
    return null;
  }

  const plainProduct = product.get({ plain: true });

  const images = await ProductImage.findAll({
    where: { product_id: productId },
    attributes: ['id', 'image_path'],
    order: [['id', 'ASC']],
  });

  return {
    ...plainProduct,
    price: Number(plainProduct.price),
    stock_quantity: Number(plainProduct.stock_quantity),
    images: images.map((image) => image.get({ plain: true })),
  };
}

async function getCategories() {
  const categories = await Category.findAll({ order: [['category_name', 'ASC']] });

  return categories.map((category) => category.get({ plain: true }));
}

async function getCategoryById(categoryId) {
  const category = await Category.findByPk(categoryId);

  return category ? category.get({ plain: true }) : null;
}

async function getUsers() {
  const users = await User.findAll({
    attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone', 'address', 'created_at'],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return users.map((user) => user.get({ plain: true }));
}

async function getProductSalesSummary() {
  const products = await Product.findAll({
    include: [{ model: OrderItem, attributes: ['quantity', 'price'] }],
    order: [['product_name', 'ASC']],
  });

  return products
    .map((product) => {
      const plainProduct = product.get({ plain: true });
      const items = plainProduct.OrderItems || [];

      return {
        id: plainProduct.id,
        product_name: plainProduct.product_name,
        units_sold: items.reduce((sum, item) => sum + Number(item.quantity), 0),
        total_sales: items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0),
      };
    })
    .sort((a, b) => b.units_sold - a.units_sold || a.product_name.localeCompare(b.product_name));
}

async function updateUserRole(userId, role) {
  if (!['admin', 'customer'].includes(role)) {
    const error = new Error('Please select a valid role.');
    error.statusCode = 400;
    throw error;
  }

  await User.update({ role }, { where: { id: userId } });
}

async function updateUserStatus(userId, status) {
  if (!['active', 'inactive'].includes(status)) {
    const error = new Error('Please select a valid status.');
    error.statusCode = 400;
    throw error;
  }

  await User.update({ status }, { where: { id: userId } });
}

async function updateOrderItemStatus(itemId, status) {
  if (!ORDER_ITEM_STATUSES.includes(status)) {
    const error = new Error('Please select a valid item status.');
    error.statusCode = 400;
    throw error;
  }

  const orderItem = await OrderItem.findByPk(itemId, {
    attributes: ['id', 'status', 'order_id'],
  });

  if (!orderItem) {
    const error = new Error('Order item not found.');
    error.statusCode = 404;
    throw error;
  }

  if (status === 'Cancelled' && orderItem.status !== 'Pending') {
    const error = new Error('Items can only be cancelled while they are still pending.');
    error.statusCode = 400;
    throw error;
  }

  const [affectedRows] = await OrderItem.update({ status }, { where: { id: itemId } });

  return affectedRows;
}

module.exports = {
  getAllOrders,
  getCategories,
  getCategoryById,
  getOrderById,
  getOrderByItemId,
  getProductById,
  getProducts,
  getProductSalesSummary,
  getUsers,
  updateUserRole,
  updateUserStatus,
  updateOrderItemStatus
};
