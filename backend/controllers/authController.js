const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const { User } = require('../config/sequelize');
const userModel = require('../models/userModel');

function wantsJson(req) {
  return req.xhr || req.headers.accept?.includes('application/json');
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

function getJwtSecret() {
  return process.env.JWT_SECRET || 'kitkart-jwt-secret';
}

function getLogin(req, res) {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'login.html'));
}

function getRegister(req, res) {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'register.html'));
}

function getForgotPassword(req, res) {
  res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'forgot-password.html'));
}

async function postForgotPassword(req, res) {
  try {
    await userModel.resetPasswordByEmail(
      req.body.email,
      req.body.password,
      req.body.confirm_password
    );

    if (wantsJson(req)) {
      return res.status(200).json({ success: true, message: 'Password changed. You can now login.' });
    }

    return res.status(200).send('Password changed. You can now login.');
  } catch (error) {
    if (wantsJson(req)) {
      return res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Unable to change password.' });
    }

    return res.status(error.statusCode || 500).send(error.message || 'Unable to change password.');
  }
}

async function postRegister(req, res) {
  const { first_name, last_name, email, password, confirm_password, phone, address } = req.body;

  if (!first_name || !last_name || !email || !password || !confirm_password) {
    if (wantsJson(req)) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
    }

    return res.status(400).send('Please fill in all required fields.');
  }

  if (password !== confirm_password) {
    if (wantsJson(req)) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    return res.status(400).send('Passwords do not match.');
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

      return res.status(409).send('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      first_name,
      last_name,
      email,
      password: hashedPassword,
      role: 'customer',
      status: 'active',
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

    return res.status(500).send('Registration failed. Please try again.');
  }
}

async function postLogin(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    if (wantsJson(req)) {
      return res.status(400).json({ success: false, message: 'Please enter your email and password.' });
    }

    return res.status(400).send('Please enter your email and password.');
  }

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      if (wantsJson(req)) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      return res.status(401).send('Invalid email or password.');
    }

    if (user.status !== 'active') {
      if (wantsJson(req)) {
        return res.status(403).json({ success: false, message: 'This account is inactive.' });
      }

      return res.status(403).send('This account is inactive.');
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

      return res.status(401).send('Invalid email or password.');
    }

    const role = String(user.role || '').trim().toLowerCase();
    const token = jwt.sign({ id: user.id }, getJwtSecret());
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

    return res.status(500).send('Login failed. Please try again.');
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
