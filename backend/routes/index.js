const express = require('express');
const { getRedirectUrlForRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(getRedirectUrlForRole(req.session.user.role));
  }

  res.render('index', {
    title: 'Kitkart',
  });
});

module.exports = router;
