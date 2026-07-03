const productModel = require('../models/productModel');
const reviewModel = require('../models/reviewModel');
const db = require('../models');
const Category = db.Category;
const Product = db.Product;
const ProductImage = db.ProductImage;

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

function getImagePath(file) {
  return file ? file.filename : null;
}

function getUploadedFile(req, fieldName) {
  if (Array.isArray(req.files)) {
    return req.files.find((file) => file.fieldname === fieldName) || null;
  }

  if (req.files && Array.isArray(req.files[fieldName])) {
    return req.files[fieldName][0] || null;
  }

  if (req.file && req.file.fieldname === fieldName) {
    return req.file;
  }

  return null;
}

function getUploadedFiles(req, fieldName) {
  if (Array.isArray(req.files)) {
    return req.files.filter((file) => file.fieldname === fieldName);
  }

  if (req.files && Array.isArray(req.files[fieldName])) {
    return req.files[fieldName];
  }

  return [];
}

async function addGalleryImages(productId, files) {
  for (const file of files) {
    await ProductImage.create({ product_id: productId, image_path: file.filename });
  }
}

async function getAllProducts(req, res) {
  try {
    const products = await Product.findAll({
      include: [{ model: Category, attributes: ['category_name'] }],
      order: [['product_name', 'ASC']],
    });

    return res.status(200).json({
      success: true,
      rows: products,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error fetching products' });
  }
}

async function getSingleProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, attributes: ['category_name'] }],
    });

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, result: product });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error fetching product' });
  }
}

async function createProductApi(req, res) {
  try {
    const { category_id, product_name, description, price, stock_quantity } = req.body;
    const mainImage = getUploadedFile(req, 'main_image') || req.file;
    const galleryImages = getUploadedFiles(req, 'gallery_images').slice(0, 8);

    if (!category_id || !product_name || price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!mainImage) {
      return res.status(400).json({ success: false, message: 'Main image is required.' });
    }

    const product = await Product.create({
      category_id,
      product_name,
      description,
      price,
      stock_quantity: stock_quantity || 0,
      image: getImagePath(mainImage),
    });

    await addGalleryImages(product.id, galleryImages);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      result: product,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error creating product', details: error.message });
  }
}

async function updateProductApi(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const mainImage = getUploadedFile(req, 'main_image') || req.file;
    const galleryImages = getUploadedFiles(req, 'gallery_images').slice(0, 8);
    const imagePath = getImagePath(mainImage);

    await product.update({
      category_id: req.body.category_id || product.category_id,
      product_name: req.body.product_name || product.product_name,
      description: req.body.description || product.description,
      price: req.body.price || product.price,
      stock_quantity: req.body.stock_quantity || product.stock_quantity,
      image: imagePath || product.image,
    });

    await addGalleryImages(product.id, galleryImages);

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      result: product,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error updating product', details: error.message });
  }
}

async function deleteProductApi(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await product.destroy();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error deleting product' });
  }
}

module.exports = {
  createProductApi,
  deleteProductApi,
  getAllProducts,
  getSingleProduct,
  index,
  show,
  updateProductApi,
};
