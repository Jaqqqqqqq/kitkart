const path = require('path');
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const multer = require('multer');

const { testConnection } = require('./config/db');
const { sequelize } = require('./config/sequelize');
const indexRoutes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.engine('html', require('ejs').renderFile);
const frontendPath = path.resolve(__dirname, '..', 'frontend');
const frontendCssPath = path.resolve(frontendPath, 'css');
const frontendJsPath = path.resolve(__dirname, '..', 'frontend', 'js');
const frontendImagesPath = path.resolve(__dirname, '..', 'frontend', 'images');

app.set('views', frontendPath);

app.use('/css', express.static(frontendCssPath));
app.use('/js', express.static(frontendJsPath));
app.use('/images', express.static(frontendImagesPath));

const upload = multer({
  dest: frontendImagesPath,
});

app.locals.upload = upload;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'kitkart-session-secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

app.use('/api/v1', apiRoutes);
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', customerRoutes);
app.use('/', dashboardRoutes);
app.use('/shop', productRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/', orderRoutes);
app.use('/', reviewRoutes);

async function startServer() {
  try {
    await testConnection();
    const queryInterface = sequelize.getQueryInterface();
    const orderItemsTable = await queryInterface.describeTable('order_items');

    if (!Object.prototype.hasOwnProperty.call(orderItemsTable, 'status')) {
      await queryInterface.addColumn('order_items', 'status', {
        type: sequelize.Sequelize.ENUM('Pending', 'Shipped', 'Delivered', 'Cancelled'),
        allowNull: false,
        defaultValue: 'Pending',
      });
      console.log('Added missing status column to order_items.');
    }

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the MySQL database.');
    console.error(error.message);
    process.exit(1);
  }
}

startServer();
