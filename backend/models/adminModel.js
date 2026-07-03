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

async function addProductImages(productId, images = []) {
  for (const image of images) {
    await ProductImage.create({ product_id: productId, image_path: image });
  }
}

async function createProduct(input, options = {}) {
  const product = normalizeProductInput(input, options.mainImage);
  const error = validateProduct(product);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  if (!product.image) {
    const validationError = new Error('Main image is required.');
    validationError.statusCode = 400;
    throw validationError;
  }

  const createdProduct = await Product.create(product);
  await addProductImages(createdProduct.id, options.galleryImages);
}

function normalizeRemoveImageIds(value) {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

async function updateProduct(productId, input, options = {}) {
  const existingProduct = await Product.findByPk(productId);

  if (!existingProduct) {
    const error = new Error('Product not found.');
    error.statusCode = 404;
    throw error;
  }

  const removeMainImage = input.remove_main_image === '1';
  const nextMainImage = options.mainImage || (removeMainImage ? null : existingProduct.image);
  const product = normalizeProductInput(input, nextMainImage);
  const error = validateProduct(product);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  if (!product.image) {
    const validationError = new Error('Main image is required.');
    validationError.statusCode = 400;
    throw validationError;
  }

  await Product.update(product, { where: { id: productId } });

  const removeImageIds = normalizeRemoveImageIds(input.remove_gallery_image_ids);

  if (removeImageIds.length > 0) {
    await ProductImage.destroy({
      where: {
        id: removeImageIds,
        product_id: productId,
      },
    });
  }

  await addProductImages(productId, options.galleryImages);
}

async function deleteProduct(productId) {
  await Product.destroy({ where: { id: productId } });
}

async function getCategories() {
  const categories = await Category.findAll({ order: [['category_name', 'ASC']] });

  return categories.map((category) => category.get({ plain: true }));
}

async function getCategoryById(categoryId) {
  const category = await Category.findByPk(categoryId);

  return category ? category.get({ plain: true }) : null;
}

async function createCategory(input) {
  const category = normalizeCategoryInput(input);
  const error = validateCategory(category);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await Category.create(category);
}

async function updateCategory(categoryId, input) {
  const category = normalizeCategoryInput(input);
  const error = validateCategory(category);

  if (error) {
    const validationError = new Error(error);
    validationError.statusCode = 400;
    throw validationError;
  }

  await Category.update(category, { where: { id: categoryId } });
}

async function deleteCategory(categoryId) {
  await Category.destroy({ where: { id: categoryId } });
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

    const [affectedRows] = await OrderItem.update({ status }, { where: { id: itemId } });

    if (affectedRows === 0) {
      const error = new Error('Order item not found.');
      error.statusCode = 404;
      throw error;
    }

    return affectedRows;

}

module.exports = {
  createCategory,
  createProduct,
  deleteCategory,
  deleteProduct,
  getAllOrders,
  getCategories,
  getCategoryById,
  getOrderById,
  getProductById,
  getProducts,
  getProductSalesSummary,
  getUsers,
  updateCategory,
  updateProduct,
  updateUserRole,
  updateUserStatus,
  updateOrderItemStatus
};
