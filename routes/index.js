const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }

  res.render('index', {
    title: 'Kitkart',
  });
});

module.exports = router;
