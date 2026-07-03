const db = require('../models');
const User = db.User;

async function getUserFromToken(req) {
  if (req.session?.user?.id) {
    return User.findOne({
      where: {
        id: req.session.user.id,
        status: 'active',
      },
    });
  }

  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearerToken || req.headers['x-auth-token'] || req.body.token || req.query.token;

  if (!token) {
    return null;
  }

  return User.findOne({
    where: {
      token,
      status: 'active',
    },
  });
}

function getRole(req) {
  return String(req.session?.user?.role || '').trim().toLowerCase();
}

function hasRole(req, allowedRoles) {
  const role = getRole(req);
  const normalizedAllowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return normalizedAllowedRoles
    .map((allowedRole) => String(allowedRole || '').trim().toLowerCase())
    .includes(role);
}

function requireRole(allowedRoles, errorMessage = 'Access denied.') {
  return function roleGuard(req, res, next) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    if (!hasRole(req, allowedRoles)) {
      return res.status(403).send(errorMessage);
    }

    return next();
  };
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

  if (!hasRole(req, 'customer')) {
    return res.status(403).send('Only customers can access this page.');
  }

  return next();
}

function requireAdmin(req, res, next) {
  return requireRole('admin', 'Only administrators can access this page.')(req, res, next);
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

async function isAuthenticatedUser(req, res, next) {
  try {
    const user = await getUserFromToken(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource',
      });
    }

    req.user = user.get({ plain: true });
    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
    });
  }
}

function authorizeRoles(...roles) {
  const normalizedRoles = roles.map((role) => String(role || '').trim().toLowerCase());

  return function apiRoleGuard(req, res, next) {
    const role = String(req.user?.role || '').trim().toLowerCase();

    if (!normalizedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin roles can access this api',
      });
    }

    return next();
  };
}

module.exports = {
  hasRole,
  getRole,
  getUserFromToken,
  requireLogin,
  redirectIfLoggedIn,
  requireRole,
  requireAdmin,
  requireCustomer,
  requireCustomerOrAdmin,
  isAuthenticatedUser,
  authorizeRoles,
};
