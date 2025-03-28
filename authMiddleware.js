// authMiddleware.js

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (!req.session.isAuthenticated) {
    console.log('User not authenticated');
    // Check if request expects JSON (either via XHR or Accept header)
    if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    return res.redirect('/login');
  }
  console.log('User authenticated, proceeding...');
  next();
}

// Middleware to check if the user has one of the required roles
function checkRole(roles) {
  return function(req, res, next) {
    console.log('Checking roles:', req.session.user ? req.session.user.role : 'No user in session');
    if (req.session.isAuthenticated && roles.includes(req.session.user.role)) {
      return next();
    }
    // If the request expects JSON, return a JSON error response
    if (req.xhr || req.headers.accept.indexOf('json') !== -1) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    // Otherwise, render the custom HTML page
    res.status(403).render('accessDenied', { returnUrl: '/inspection' });
  };
}

module.exports = { isAuthenticated, checkRole };
