const { Category, Product, ProductImage } = require('../config/sequelize');

function normalizeImagePath(imagePath) {
  if (!imagePath) {
    return null;
  }

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }

  return `/images/${imagePath}`;
}

async function getAllProducts() {
  const products = await Product.findAll({
    include: [
      { model: Category, attributes: ['id', 'category_name'] },
      { model: ProductImage, attributes: ['image_path'] },
    ],
    order: [['product_name', 'ASC']],
  });

  return products.map((product) => {
    const item = product.get({ plain: true });
    const galleryImage = item.ProductImages?.[0]?.image_path || null;
    const displayImage = item.image || galleryImage;

    return {
      ...item,
      price: Number(item.price),
      product_image: item.image,
      category_id: item.Category.id,
      category_name: item.Category.category_name,
      image_url: normalizeImagePath(displayImage),
    };
  });
}

async function getProductById(productId) {
  const product = await Product.findByPk(productId, {
    include: [
      { model: Category, attributes: ['id', 'category_name'] },
      { model: ProductImage, attributes: ['image_path'], order: [['id', 'ASC']] },
    ],
  });

  if (!product) {
    return null;
  }

  const item = product.get({ plain: true });
  const imageUrls = [];
  const mainImageUrl = normalizeImagePath(item.image);

  if (mainImageUrl) {
    imageUrls.push(mainImageUrl);
  }

  (item.ProductImages || [])
    .map((image) => normalizeImagePath(image.image_path))
    .filter(Boolean)
    .forEach((imageUrl) => {
      if (!imageUrls.includes(imageUrl)) {
        imageUrls.push(imageUrl);
      }
    });

  return {
    ...item,
    price: Number(item.price),
    product_image: item.image,
    category_id: item.Category.id,
    category_name: item.Category.category_name,
    image_urls: imageUrls,
    image_url: imageUrls[0] || null,
  };
}

async function getAllCategories() {
  const categories = await Category.findAll({
    attributes: ['id', 'category_name'],
    order: [['category_name', 'ASC']],
  });

  return categories.map((category) => category.get({ plain: true }));
}

module.exports = {
  getAllProducts,
  getProductById,
  getAllCategories,
};
