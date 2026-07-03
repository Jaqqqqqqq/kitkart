const { Order, OrderItem, Product, Review, User } = require('../config/sequelize');

function normalizeRating(rating) {
  const value = Number(rating);

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return null;
  }

  return value;
}

async function getReviewsForProduct(productId) {
  const reviews = await Review.findAll({
    where: { product_id: productId },
    include: [{ model: User, attributes: ['first_name', 'last_name'] }],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return reviews.map((review) => {
    const item = review.get({ plain: true });

    return {
      ...item,
      first_name: item.User.first_name,
      last_name: item.User.last_name,
    };
  });
}

async function getRatingSummary(productId) {
  const reviews = await Review.findAll({
    where: { product_id: productId },
    attributes: ['rating'],
  });

  const reviewCount = reviews.length;
  const ratingTotal = reviews.reduce((sum, review) => sum + Number(review.rating), 0);

  return {
    average_rating: reviewCount > 0 ? ratingTotal / reviewCount : 0,
    review_count: reviewCount,
  };
}

async function getPurchasedOrderForProduct(userId, productId) {
  const order = await Order.findOne({
    where: { user_id: userId },
    include: [
      {
        model: OrderItem,
        where: { product_id: productId, status: 'Delivered' },
      },
    ],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return order ? order.get({ plain: true }) : null;
}

async function getUserReviewForProduct(userId, productId) {
  const review = await Review.findOne({
    where: { user_id: userId, product_id: productId },
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return review ? review.get({ plain: true }) : null;
}

async function canUserReviewProduct(userId, productId) {
  const [order, existingReview] = await Promise.all([
    getPurchasedOrderForProduct(userId, productId),
    getUserReviewForProduct(userId, productId),
  ]);

  const deliveredItem = order?.OrderItems?.find((item) => item.status === 'Delivered');

  return {
    canReview: Boolean(deliveredItem) && !existingReview,
    order: deliveredItem ? order : null,
    existingReview,
  };
}

async function createReview(userId, productId, rating, reviewText) {
  const normalizedRating = normalizeRating(rating);
  const cleanReviewText = String(reviewText || '').trim();

  if (!normalizedRating) {
    const error = new Error('Rating must be between 1 and 5.');
    error.statusCode = 400;
    throw error;
  }

  if (!cleanReviewText) {
    const error = new Error('Review text is required.');
    error.statusCode = 400;
    throw error;
  }

  const eligibility = await canUserReviewProduct(userId, productId);

  if (!eligibility.order) {
    const error = new Error('You can only review products after they are delivered.');
    error.statusCode = 403;
    throw error;
  }

  if (eligibility.existingReview) {
    const error = new Error('You have already reviewed this product.');
    error.statusCode = 400;
    throw error;
  }

  await Review.create({
    user_id: userId,
    product_id: productId,
    order_id: eligibility.order.id,
    rating: normalizedRating,
    review_text: cleanReviewText,
  });
}

async function getReviewForUser(reviewId, userId) {
  const review = await Review.findOne({
    where: { id: reviewId, user_id: userId },
    include: [{ model: Product, attributes: ['product_name'] }],
  });

  if (!review) {
    return null;
  }

  const item = review.get({ plain: true });
  return {
    ...item,
    product_name: item.Product.product_name,
  };
}

async function updateReview(reviewId, userId, rating, reviewText) {
  const normalizedRating = normalizeRating(rating);
  const cleanReviewText = String(reviewText || '').trim();

  if (!normalizedRating) {
    const error = new Error('Rating must be between 1 and 5.');
    error.statusCode = 400;
    throw error;
  }

  if (!cleanReviewText) {
    const error = new Error('Review text is required.');
    error.statusCode = 400;
    throw error;
  }

  const review = await getReviewForUser(reviewId, userId);

  if (!review) {
    const error = new Error('Review not found.');
    error.statusCode = 404;
    throw error;
  }

  await Review.update(
    { rating: normalizedRating, review_text: cleanReviewText },
    { where: { id: reviewId, user_id: userId } }
  );

  return review.product_id;
}

async function deleteReview(reviewId, userId) {
  const review = await getReviewForUser(reviewId, userId);

  if (!review) {
    const error = new Error('Review not found.');
    error.statusCode = 404;
    throw error;
  }

  await Review.destroy({ where: { id: reviewId, user_id: userId } });

  return review.product_id;
}

async function getReviewsForAdmin() {
  const reviews = await Review.findAll({
    include: [
      { model: User, attributes: ['first_name', 'last_name', 'email'] },
      { model: Product, attributes: ['product_name'] },
      { model: Order, attributes: ['id'] },
    ],
    order: [
      ['created_at', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  return reviews.map((review) => {
    const item = review.get({ plain: true });

    return {
      ...item,
      customer_name: `${item.User.first_name} ${item.User.last_name}`,
      customer_email: item.User.email,
      product_name: item.Product.product_name,
      order_id: item.Order.id,
    };
  });
}

module.exports = {
  getReviewsForProduct,
  getRatingSummary,
  canUserReviewProduct,
  createReview,
  getReviewForUser,
  getReviewsForAdmin,
  updateReview,
  deleteReview,
};
