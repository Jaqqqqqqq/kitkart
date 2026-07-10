const reviewModel = require('../models/reviewModel');

function renderError(res, statusCode, message) {
  return res.status(statusCode).send(message);
}

async function create(req, res) {
  try {
    await reviewModel.createReview(
      req.session.user.id,
      req.params.productId,
      req.body.rating,
      req.body.review_text
    );

    return res.redirect(`/shop/${req.params.productId}`);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error(error);
    }

    return renderError(res, statusCode, error.message || 'Unable to create review.');
  }
}

async function edit(req, res) {
  try {
    const review = await reviewModel.getReviewForUser(req.params.reviewId, req.session.user.id);

    if (!review) {
      return res.status(404).send('Review not found.');
    }

    return res.render('review-edit', {
      title: 'Edit Review',
      review,
      error: null,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load review.');
  }
}

async function update(req, res) {
  try {
    const productId = await reviewModel.updateReview(
      req.params.reviewId,
      req.session.user.id,
      req.body.rating,
      req.body.review_text
    );

    return res.redirect(`/shop/${productId}`);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error(error);
      return res.status(500).send('Unable to update review.');
    }

    const review = await reviewModel.getReviewForUser(req.params.reviewId, req.session.user.id);

    if (!review) {
      return res.status(statusCode).send(error.message);
    }

    return res.status(statusCode).render('review-edit', {
      title: 'Edit Review',
      review: {
        ...review,
        rating: req.body.rating,
        review_text: req.body.review_text,
      },
      error: error.message,
    });
  }
}

async function remove(req, res) {
  try {
    const productId = await reviewModel.deleteReview(req.params.reviewId, req.session.user.id);
    return res.redirect(`/shop/${productId}`);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error(error);
    }

    return res.status(statusCode).send(error.message || 'Unable to delete review.');
  }
}

function handleApiError(res, error, fallbackMessage) {
  console.log(error);
  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || fallbackMessage,
  });
}

async function getProductReviews(req, res) {
  try {
    const [reviews, ratingSummary] = await Promise.all([
      reviewModel.getReviewsForProduct(req.params.productId),
      reviewModel.getRatingSummary(req.params.productId),
    ]);

    return res.status(200).json({
      success: true,
      rows: reviews,
      ratingSummary,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error fetching reviews');
  }
}

async function createReview(req, res) {
  try {
    await reviewModel.createReview(req.user.id, req.body.product_id, req.body.rating, req.body.review_text);

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
    });
  } catch (error) {
    return handleApiError(res, error, 'Error creating review');
  }
}

async function updateReview(req, res) {
  try {
    const productId = await reviewModel.updateReview(req.params.id, req.user.id, req.body.rating, req.body.review_text);

    return res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      productId,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error updating review');
  }
}

async function deleteReview(req, res) {
  try {
    const productId = await reviewModel.deleteReview(req.params.id, req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
      productId,
    });
  } catch (error) {
    return handleApiError(res, error, 'Error deleting review');
  }
}

module.exports = {
  create,
  createReview,
  deleteReview,
  edit,
  getProductReviews,
  update,
  updateReview,
  remove,
};
