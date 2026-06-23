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

    return res.redirect(`/products/${req.params.productId}`);
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

    return res.render('reviews/edit', {
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

    return res.redirect(`/products/${productId}`);
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

    return res.status(statusCode).render('reviews/edit', {
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
    return res.redirect(`/products/${productId}`);
  } catch (error) {
    const statusCode = error.statusCode || 500;

    if (statusCode === 500) {
      console.error(error);
    }

    return res.status(statusCode).send(error.message || 'Unable to delete review.');
  }
}

module.exports = {
  create,
  edit,
  update,
  remove,
};
