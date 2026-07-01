function dashboard(req, res) {
  res.render('admin/dashboard', {
    title: 'Dashboard',
    currentUser: req.session.user,
  });
}

module.exports = {
  dashboard,
};
