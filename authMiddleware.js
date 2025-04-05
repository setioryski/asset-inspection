// authMiddleware.js

function isAuthenticated(req, res, next) {
  if (!req.session.isAuthenticated) {
    console.log('User not authenticated');
    // Ensure req.headers.accept is defined, defaulting to an empty string if not
    const accept = req.headers?.accept || '';
    if (req.xhr || accept.indexOf('json') !== -1) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    return res.redirect('/login');
  }
  console.log('User authenticated, proceeding...');
  next();
}

function checkRole(roles) {
  return function(req, res, next) {
    console.log('Checking roles:', req.session.user ? req.session.user.role : 'No user in session');
    if (req.session.isAuthenticated && roles.includes(req.session.user.role)) {
      return next();
    }
    const accept = req.headers?.accept || '';
    if (req.xhr || accept.indexOf('json') !== -1) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    res.status(403).render('accessDenied', { returnUrl: '/inspection' });
  };
}

module.exports = { isAuthenticated, checkRole };
