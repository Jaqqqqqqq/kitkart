const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { pool } = require('../config/db');

const USERNAME_COLUMN = 'email';
const PASSWORD_COLUMN = 'password';

function wantsJson(req) {
  return req.xhr || req.headers.accept?.includes('application/json');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authJson(user, token, redirectUrl = '/dashboard') {
  return {
    success: true,
    message: 'Authentication successful.',
    token,
    redirectUrl,
    user,
  };
}

function getLogin(req, res) {
  res.render('auth/login', {
    title: 'Login',
    error: null,
    oldInput: {},
  });
}

function getRegister(req, res) {
  res.render('auth/register', {
    title: 'Register',
    error: null,
    oldInput: {},
  });
}

async function postRegister(req, res) {
  const { first_name, last_name, email, password, confirm_password, phone, address } = req.body;

  if (!first_name || !last_name || !email || !password || !confirm_password) {
    if (wantsJson(req)) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields.',
      });
    }

    return res.status(400).render('auth/register', {
      title: 'Register',
      error: 'Please fill in all required fields.',
      oldInput: req.body,
    });
  }

  if (password !== confirm_password) {
    if (wantsJson(req)) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match.',
      });
    }

    return res.status(400).render('auth/register', {
      title: 'Register',
      error: 'Passwords do not match.',
      oldInput: req.body,
    });
  }

  try {
    const [existingUsers] = await pool.execute(
      `SELECT id FROM users WHERE ${USERNAME_COLUMN} = ? LIMIT 1`,
      [email]
    );

    if (existingUsers.length > 0) {
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
    const [result] = await pool.execute(
      `INSERT INTO users (first_name, last_name, ${USERNAME_COLUMN}, ${PASSWORD_COLUMN}, role, token, phone, address)
       VALUES (?, ?, ?, ?, 'customer', ?, ?, ?)`,
      [first_name, last_name, email, hashedPassword, token, phone || null, address || null]
    );

    const sessionUser = {
      id: result.insertId,
      first_name,
      last_name,
      email,
      role: 'customer',
    };

    req.session.user = sessionUser;

    if (wantsJson(req)) {
      return res.status(201).json(authJson(sessionUser, token));
    }

    return res.redirect('/auth/login');
  } catch (error) {
    console.error(error);

    if (wantsJson(req)) {
      return res.status(500).json({
        success: false,
        message: 'Registration failed. Please try again.',
      });
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
      return res.status(400).json({
        success: false,
        message: 'Please enter your email and password.',
      });
    }

    return res.status(400).render('auth/login', {
      title: 'Login',
      error: 'Please enter your email and password.',
      oldInput: req.body,
    });
  }

  try {
    const [users] = await pool.execute(
      `SELECT id, first_name, last_name, ${USERNAME_COLUMN}, ${PASSWORD_COLUMN}, role, status
       FROM users
       WHERE ${USERNAME_COLUMN} = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      if (wantsJson(req)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password.',
        oldInput: req.body,
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      if (wantsJson(req)) {
        return res.status(403).json({
          success: false,
          message: 'This account is inactive.',
        });
      }

      return res.status(403).render('auth/login', {
        title: 'Login',
        error: 'This account is inactive.',
        oldInput: req.body,
      });
    }

    const storedPassword = user[PASSWORD_COLUMN];
    let passwordMatches = false;

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
      passwordMatches = await bcrypt.compare(password, storedPassword);
    } else {
      passwordMatches = password === storedPassword;

      if (passwordMatches) {
        const upgradedHash = await bcrypt.hash(password, 12);
        await pool.execute(`UPDATE users SET ${PASSWORD_COLUMN} = ? WHERE id = ?`, [upgradedHash, user.id]);
      }
    }

    if (!passwordMatches) {
      if (wantsJson(req)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
      }

      return res.status(401).render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password.',
        oldInput: req.body,
      });
    }

    const role = String(user.role || '').trim().toLowerCase();

    const token = generateToken();
    await pool.execute('UPDATE users SET token = ? WHERE id = ?', [token, user.id]);

    req.session.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user[USERNAME_COLUMN],
      role,
    };

    if (wantsJson(req)) {
      return res.json(authJson(req.session.user, token));
    }

    return res.redirect('/dashboard');
  } catch (error) {
    console.error(error);

    if (wantsJson(req)) {
      return res.status(500).json({
        success: false,
        message: 'Login failed. Please try again.',
      });
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

module.exports = {
  getLogin,
  getRegister,
  postLogin,
  postRegister,
  logout,
};
