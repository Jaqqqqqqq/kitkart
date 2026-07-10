const express = require('express');
const path = require('path');
const { getRedirectUrlForRole } = require('../controllers/authController');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(getRedirectUrlForRole(req.session.user.role));
  }

  return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'index.html'));
});

module.exports = router;
