function dashboard(req, res) {
  res.render('dashboard', {
    title: 'Dashboard',
  });
}

module.exports = {
  dashboard,
};
