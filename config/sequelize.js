const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'kitkart_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: DataTypes.STRING,
    last_name: DataTypes.STRING,
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    role: DataTypes.ENUM('admin', 'customer'),
    token: DataTypes.TEXT,
    status: DataTypes.ENUM('active', 'inactive'),
    phone: DataTypes.STRING,
    address: DataTypes.TEXT,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { tableName: 'users', timestamps: false }
);

const Category = sequelize.define(
  'Category',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_name: DataTypes.STRING,
    description: DataTypes.TEXT,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { tableName: 'categories', timestamps: false }
);

const Product = sequelize.define(
  'Product',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    category_id: DataTypes.INTEGER,
    product_name: DataTypes.STRING,
    description: DataTypes.TEXT,
    price: DataTypes.DECIMAL(10, 2),
    stock_quantity: DataTypes.INTEGER,
    image: DataTypes.STRING,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { tableName: 'products', timestamps: false }
);

const Order = sequelize.define(
  'Order',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: DataTypes.INTEGER,
    payment_method: DataTypes.ENUM('Cash on Delivery', 'GCash', 'PayMaya', 'Credit Card'),
    order_status: DataTypes.ENUM('Approved', 'Pending', 'Shipped', 'Delivered', 'Cancelled'),
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  { tableName: 'orders', timestamps: false }
);

const OrderItem = sequelize.define(
  'OrderItem',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    order_id: DataTypes.INTEGER,
    product_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    price: DataTypes.DECIMAL(10, 2),
  },
  { tableName: 'order_items', timestamps: false }
);

Product.belongsTo(Category, { foreignKey: 'category_id' });
Category.hasMany(Product, { foreignKey: 'category_id' });
Order.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Order, { foreignKey: 'user_id' });
Order.hasMany(OrderItem, { foreignKey: 'order_id' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(OrderItem, { foreignKey: 'product_id' });

module.exports = {
  Category,
  Order,
  OrderItem,
  Product,
  User,
  sequelize,
};
