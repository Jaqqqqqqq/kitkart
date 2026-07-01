const express = require('express');

const { getRedirectUrlForRole, requireLogin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', requireLogin, (req, res) => {
  return res.redirect(getRedirectUrlForRole(req.session.user?.role));
});

module.exports = router;
