const bcrypt = require('bcryptjs');
const { User } = require('../config/sequelize');

function plain(user) {
  return user ? user.get({ plain: true }) : null;
}

async function getAllUsers() {
  const users = await User.findAll({
    attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone', 'address'],
  });

  return users.map((user) => user.get({ plain: true }));
}

async function getUserById(userId) {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'first_name', 'last_name', 'email', 'role', 'status', 'phone', 'address'],
  });

  return plain(user);
}

async function updateUser(userId, role, status) {
  return User.update({ role, status }, { where: { id: userId } });
}

async function checkLogin(email) {
  const user = await User.findOne({ where: { email } });

  return plain(user);
}

async function updateProfile(userId, data) {
  const firstName = String(data.first_name || '').trim();
  const lastName = String(data.last_name || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim() || null;
  const address = String(data.address || '').trim() || null;

  if (!firstName || !lastName || !email) {
    const error = new Error('First name, last name, and email are required.');
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await User.findOne({ where: { email } });

  if (existingUser && Number(existingUser.id) !== Number(userId)) {
    const error = new Error('That email is already used by another account.');
    error.statusCode = 409;
    throw error;
  }

  const [affectedRows] = await User.update(
    {
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      address,
    },
    { where: { id: userId } }
  );

  if (affectedRows === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return getUserById(userId);
}

async function updatePassword(userId, password, confirmPassword) {
  if (!password || !confirmPassword) {
    const error = new Error('New password and confirmation are required.');
    error.statusCode = 400;
    throw error;
  }

  if (password !== confirmPassword) {
    const error = new Error('Passwords do not match.');
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const [affectedRows] = await User.update({ password: hashedPassword }, { where: { id: userId } });

  if (affectedRows === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }
}

async function resetPasswordByEmail(email, password, confirmPassword) {
  const normalizedEmail = String(email || '').trim();

  if (!normalizedEmail) {
    const error = new Error('Email is required.');
    error.statusCode = 400;
    throw error;
  }

  const user = await checkLogin(normalizedEmail);

  if (!user) {
    const error = new Error('No account found with that email.');
    error.statusCode = 404;
    throw error;
  }

  await updatePassword(user.id, password, confirmPassword);
}

module.exports = {
  checkLogin,
  getAllUsers,
  getUserById,
  resetPasswordByEmail,
  updatePassword,
  updateProfile,
  updateUser,
};
