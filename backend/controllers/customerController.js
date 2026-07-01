function home(req, res) {
  res.render('customer/home', {
    title: 'Home',
    currentUser: req.session.user,
  });
}

function profile(req, res) {
  res.render('customer/profile', {
    title: 'Profile',
    currentUser: req.session.user,
  });
}

module.exports = {
  home,
  profile,
};
