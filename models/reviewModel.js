const { pool } = require('../config/db');

function normalizeRating(rating) {
  const value = Number(rating);

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    return null;
  }

  return value;
}

async function getReviewsForProduct(productId) {
  const [reviews] = await pool.execute(
    `SELECT
       r.id,
       r.user_id,
       r.product_id,
       r.order_id,
       r.rating,
       r.review_text,
       r.created_at,
       u.first_name,
       u.last_name
     FROM reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.product_id = ?
     ORDER BY r.created_at DESC, r.id DESC`,
    [productId]
  );

  return reviews;
}

async function getRatingSummary(productId) {
  const [rows] = await pool.execute(
    `SELECT
       COALESCE(AVG(rating), 0) AS average_rating,
       COUNT(id) AS review_count
     FROM reviews
     WHERE product_id = ?`,
    [productId]
  );

  return {
    average_rating: Number(rows[0].average_rating),
    review_count: Number(rows[0].review_count),
  };
}

async function getPurchasedOrderForProduct(userId, productId) {
  const [orders] = await pool.execute(
    `SELECT o.id
     FROM orders o
     INNER JOIN order_items oi ON oi.order_id = o.id
     WHERE o.user_id = ?
       AND oi.product_id = ?
       AND o.order_status <> 'Cancelled'
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT 1`,
    [userId, productId]
  );

  return orders[0] || null;
}

async function getUserReviewForProduct(userId, productId) {
  const [reviews] = await pool.execute(
    `SELECT id, user_id, product_id, order_id, rating, review_text, created_at
     FROM reviews
     WHERE user_id = ? AND product_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [userId, productId]
  );

  return reviews[0] || null;
}

async function canUserReviewProduct(userId, productId) {
  const [order, existingReview] = await Promise.all([
    getPurchasedOrderForProduct(userId, productId),
    getUserReviewForProduct(userId, productId),
  ]);

  return {
    canReview: Boolean(order) && !existingReview,
    order,
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
    const error = new Error('You can only review products you have purchased.');
    error.statusCode = 403;
    throw error;
  }

  if (eligibility.existingReview) {
    const error = new Error('You have already reviewed this product.');
    error.statusCode = 400;
    throw error;
  }

  await pool.execute(
    `INSERT INTO reviews (user_id, product_id, order_id, rating, review_text)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, productId, eligibility.order.id, normalizedRating, cleanReviewText]
  );
}

async function getReviewForUser(reviewId, userId) {
  const [reviews] = await pool.execute(
    `SELECT
       r.id,
       r.user_id,
       r.product_id,
       r.order_id,
       r.rating,
       r.review_text,
       r.created_at,
       p.product_name
     FROM reviews r
     INNER JOIN products p ON p.id = r.product_id
     WHERE r.id = ? AND r.user_id = ?
     LIMIT 1`,
    [reviewId, userId]
  );

  return reviews[0] || null;
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

  await pool.execute(
    `UPDATE reviews
     SET rating = ?, review_text = ?
     WHERE id = ? AND user_id = ?`,
    [normalizedRating, cleanReviewText, reviewId, userId]
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

  await pool.execute('DELETE FROM reviews WHERE id = ? AND user_id = ?', [reviewId, userId]);

  return review.product_id;
}

module.exports = {
  getReviewsForProduct,
  getRatingSummary,
  canUserReviewProduct,
  createReview,
  getReviewForUser,
  updateReview,
  deleteReview,
};
