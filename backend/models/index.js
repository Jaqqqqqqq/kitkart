const {
  Category,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Product,
  ProductImage,
  Review,
  User,
  sequelize,
} = require('../config/sequelize');

const db = {};

db.Category = Category;
db.Cart = Cart;
db.CartItem = CartItem;
db.Order = Order;
db.OrderItem = OrderItem;
db.Product = Product;
db.ProductImage = ProductImage;
db.Review = Review;
db.User = User;
db.sequelize = sequelize;

module.exports = db;
