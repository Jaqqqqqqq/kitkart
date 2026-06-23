const productModel = require('../models/productModel');
const reviewModel = require('../models/reviewModel');

async function index(req, res) {
  try {
    const [products, categories] = await Promise.all([
      productModel.getAllProducts(),
      productModel.getAllCategories(),
    ]);

    res.render('products/index', {
      title: 'School Supplies Catalog',
      products,
      categories,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Unable to load products.');
  }
}

async function show(req, res) {
  try {
    const product = await productModel.getProductById(req.params.id);

    if (!product) {
      return res.status(404).send('Product not found.');
    }

    const [reviews, ratingSummary, reviewEligibility] = await Promise.all([
      reviewModel.getReviewsForProduct(req.params.id),
      reviewModel.getRatingSummary(req.params.id),
      reviewModel.canUserReviewProduct(req.session.user.id, req.params.id),
    ]);

    return res.render('products/show', {
      title: product.product_name,
      product,
      reviews,
      ratingSummary,
      reviewEligibility,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load product details.');
  }
}

module.exports = {
  index,
  show,
};
