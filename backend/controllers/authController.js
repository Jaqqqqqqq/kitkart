const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { User } = require('../config/sequelize');
const userModel = require('../models/userModel');

function wantsJson(req) {
  return req.xhr || req.headers.accept?.includes('application/json');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authJson(user, token, redirectUrl) {
  return {
    success: true,
    message: 'Authentication successful.',
    token,
    redirectUrl,
    user,
  };
}

function getRedirectUrlForRole(role) {
  return String(role || '').trim().toLowerCase() === 'admin' ? '/admin/dashboard' : '/home';
}

function getLogin(req, res) {
  res.render('auth/login', { title: 'Login', error: null, oldInput: {} });
}

function getRegister(req, res) {
  res.render('auth/register', { title: 'Register', error: null, oldInput: {} });
}

function getForgotPassword(req, res) {
  res.render('auth/forgot-password', {
    title: 'Forgot Password',
    error: null,
    success: null,
    oldInput: {},
  });
}

async function postForgotPassword(req, res) {
  try {
    await userModel.resetPasswordByEmail(
      req.body.email,
      req.body.password,
      req.body.confirm_password
    );

    return res.render('auth/forgot-password', {
      title: 'Forgot Password',
      error: null,
      success: 'Password changed. You can now login.',
      oldInput: {},
    });
  } catch (error) {
    return res.status(error.statusCode || 500).render('auth/forgot-password', {
      title: 'Forgot Password',
      error: error.message || 'Unable to change password.',
      success: null,
      oldInput: req.body,
    });
  }
}

async function postRegister(req, res) {
  const { first_name, last_name, email, password, confirm_password, phone, address } = req.body;

  if (!first_name || !last_name || !email || !password || !confirm_password) {
    if (wantsJson(req)) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    return res.status(400).render('auth/register', {
      title: 'Register',
      error: 'Please fill in all required fields.',
      oldInput: req.body,
    });
  }

  if (password !== confirm_password) {
    if (wantsJson(req)) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    return res.status(400).render('auth/register', {
      title: 'Register',
      error: 'Passwords do not match.',
      oldInput: req.body,
    });
  }

  try {
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      if (wantsJson(req)) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists.',
        });
      }

      return res.status(409).render('auth/register', {
        title: 'Register',
        error: 'An account with this email already exists.',
        oldInput: req.body,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = generateToken();

    const user = await User.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      role: 'customer',
      status: 'active',
      token,
      phone: phone || null,
      address: address || null,
    });

    const sessionUser = {
      id: user.id,
      first_name,
      last_name,
      email,
      role: 'customer',
    };

    // Redirect to login instead of auto-logging in
    if (wantsJson(req)) {
      return res.status(201).json({
        success: true,
        message: 'Registration successful! Please log in.',
        redirectUrl: '/auth/login'
      });
    }

    return res.redirect('/auth/login');
  } catch (error) {
    console.error(error);

    if (wantsJson(req)) {
      return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    }

    return res.status(500).render('auth/register', {
      title: 'Register',
      error: 'Registration failed. Please try again.',
      oldInput: req.body,
    });
  }
}

async function postLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    if (wantsJson(req)) {
      return res.status(400).json({ success: false, message: 'Please enter your email and password.' });
    }

    return res.status(400).render('auth/login', {
      title: 'Login',
      error: 'Please enter your email and password.',
      oldInput: req.body,
    });
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password.',
        oldInput: req.body,
      });
    }

    if (user.status !== 'active') {
      if (wantsJson(req)) {
        return res.status(403).json({ success: false, message: 'This account is inactive.' });
      }

      return res.status(403).render('auth/login', {
        title: 'Login',
        error: 'This account is inactive.',
        oldInput: req.body,
      });
    }

    const storedPassword = user.password;
    let passwordMatches = false;

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      passwordMatches = await bcrypt.compare(password, storedPassword);
    } else {
      passwordMatches = password === storedPassword;
      if (passwordMatches) {
        const upgradedHash = await bcrypt.hash(password, 12);
        await user.update({ password: upgradedHash });
      }
    }

    if (!passwordMatches) {
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password.',
        oldInput: req.body,
      });
    }

    const role = String(user.role || '').trim().toLowerCase();
    const token = generateToken();
    await user.update({ token });

    req.session.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role,
    };

    const redirectUrl = getRedirectUrlForRole(role);

    if (wantsJson(req)) {
      return res.json(authJson(req.session.user, token, redirectUrl));
    }

    return res.redirect(redirectUrl);
  } catch (error) {
    console.error(error);

    if (wantsJson(req)) {
      return res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }

    return res.status(500).render('auth/login', {
      title: 'Login',
      error: 'Login failed. Please try again.',
      oldInput: req.body,
    });
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
}

async function registerUser(req, res) {
  req.body.confirm_password = req.body.confirm_password || req.body.password;
  return postRegister(req, res);
}

async function loginUser(req, res) {
  return postLogin(req, res);
}

async function logoutUser(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;

  try {
    if (token) {
      await User.update({ token: null }, { where: { token } });
    }

    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Logout failed.',
    });
  }
}

module.exports = {
  getRedirectUrlForRole,
  getForgotPassword,
  getLogin,
  getRegister,
  loginUser,
  postLogin,
  postForgotPassword,
  postRegister,
  registerUser,
  logout,
  logoutUser,
};
