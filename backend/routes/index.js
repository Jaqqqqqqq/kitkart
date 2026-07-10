const express = require('express');
const { getRedirectUrlForRole } = require('../controllers/authController');
const { renderPage } = require('../services/viewService');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(getRedirectUrlForRole(req.session.user.role));
  }

  return renderPage(res, 'index', { title: 'Kitkart' });
});

module.exports = router;
