function getRole(req) {
  return String(req.session.user?.role || '').trim().toLowerCase();
}

function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  return next();
}

function redirectIfLoggedIn(req, res, next) {
  if (!req.session.user) {
    return next();
  }

  return res.redirect('/dashboard');
}

function requireCustomer(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  if (getRole(req) !== 'customer') {
    return res.status(403).send('Only customers can access this page.');
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  if (getRole(req) !== 'admin') {
    return res.status(403).send('Only administrators can access this page.');
  }

  return next();
}

function requireCustomerOrAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  const role = getRole(req);

  if (role !== 'customer' && role !== 'admin') {
    return res.status(403).send('Access denied.');
  }

  return next();
}

module.exports = {
  getRole,
  requireLogin,
  redirectIfLoggedIn,
  requireAdmin,
  requireCustomer,
  requireCustomerOrAdmin,
};
