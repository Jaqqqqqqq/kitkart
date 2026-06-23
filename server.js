const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');

const { testConnection } = require('./config/db');
const indexRoutes = require('./routes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
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

app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', dashboardRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/', orderRoutes);
app.use('/', reviewRoutes);

async function startServer() {
  try {
    await testConnection();

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
