const { pool } = require('../config/db');

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
  const [products] = await pool.execute(
    `SELECT
       p.id,
       p.product_name,
       p.description,
       p.price,
       p.stock_quantity,
       p.image AS product_image,
       c.id AS category_id,
       c.category_name,
       COALESCE(MIN(pi.image_path), p.image) AS display_image
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_images pi ON pi.product_id = p.id
     GROUP BY
       p.id,
       p.product_name,
       p.description,
       p.price,
       p.stock_quantity,
       p.image,
       c.id,
       c.category_name
     ORDER BY p.product_name ASC`
  );

  return products.map((product) => ({
    ...product,
    image_url: normalizeImagePath(product.display_image),
  }));
}

async function getProductById(productId) {
  const [products] = await pool.execute(
    `SELECT
       p.id,
       p.product_name,
       p.description,
       p.price,
       p.stock_quantity,
       p.image AS product_image,
       c.id AS category_id,
       c.category_name
     FROM products p
     INNER JOIN categories c ON c.id = p.category_id
     WHERE p.id = ?
     LIMIT 1`,
    [productId]
  );

  if (products.length === 0) {
    return null;
  }

  const product = products[0];
  const [images] = await pool.execute(
    `SELECT image_path
     FROM product_images
     WHERE product_id = ?
     ORDER BY id ASC`,
    [productId]
  );

  const imageUrls = images
    .map((image) => normalizeImagePath(image.image_path))
    .filter(Boolean);

  if (imageUrls.length === 0 && product.product_image) {
    imageUrls.push(normalizeImagePath(product.product_image));
  }

  return {
    ...product,
    image_urls: imageUrls,
    image_url: imageUrls[0] || null,
  };
}

async function getAllCategories() {
  const [categories] = await pool.execute(
    `SELECT id, category_name
     FROM categories
     ORDER BY category_name ASC`
  );

  return categories;
}

module.exports = {
  getAllProducts,
  getProductById,
  getAllCategories,
};
