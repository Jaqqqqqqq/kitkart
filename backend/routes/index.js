const express = require('express');
const { getRedirectUrlForRole } = require('../controllers/authController');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(getRedirectUrlForRole(req.session.user.role));
  }

  return res.render('index', { title: 'Kitkart' }, (error, html) => {
    if (error) {
      console.error('Home render failed:', error);
      return res.status(500).send(error.message);
    }

    return res.send(html);
  });
});

module.exports = router;
