const productModel = require('../models/productModel');
const reviewModel = require('../models/reviewModel');
const db = require('../models');
const path = require('path');
const Category = db.Category;
const Product = db.Product;
const ProductImage = db.ProductImage;

async function index(req, res) {
  try {
    res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'products.html'));
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

    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'product-show.html'));
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

function normalizeRemoveImageIds(value) {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
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

    if (Number(price) < 0 || Number(stock_quantity) < 0) {
      return res.status(400).json({ success: false, message: 'Price and stock quantity cannot be negative.' });
    }

    const product = await Product.create({
      category_id,
      product_name: String(product_name).trim(),
      description: String(description || '').trim() || null,
      price,
      stock_quantity,
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
    const removeMainImage = req.body.remove_main_image === '1';
    const nextImage = imagePath || (removeMainImage ? null : product.image);

    if (!req.body.category_id || !req.body.product_name || req.body.price === undefined || req.body.stock_quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (Number(req.body.price) < 0 || Number(req.body.stock_quantity) < 0) {
      return res.status(400).json({ success: false, message: 'Price and stock quantity cannot be negative.' });
    }

    if (!nextImage) {
      return res.status(400).json({ success: false, message: 'Main image is required.' });
    }

    await product.update({
      category_id: req.body.category_id,
      product_name: String(req.body.product_name).trim(),
      description: String(req.body.description || '').trim() || null,
      price: req.body.price,
      stock_quantity: req.body.stock_quantity,
      image: nextImage,
    });

    const removeImageIds = normalizeRemoveImageIds(req.body.remove_gallery_image_ids);

    if (removeImageIds.length > 0) {
      await ProductImage.destroy({
        where: {
          id: removeImageIds,
          product_id: product.id,
        },
      });
    }

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
