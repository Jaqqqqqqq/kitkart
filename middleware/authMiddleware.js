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

  if (req.session.user.role !== 'customer') {
    return res.status(403).send('Only customers can access this page.');
  }

  return next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).send('Only administrators can access this page.');
  }

  return next();
}

module.exports = {
  requireLogin,
  redirectIfLoggedIn,
  requireAdmin,
  requireCustomer,
};
