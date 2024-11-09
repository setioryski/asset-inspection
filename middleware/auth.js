// authMiddleware.js

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
    if (!req.session.isAuthenticated) {
        console.log('User not authenticated, redirecting to login...');
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
        res.status(403).send("Access Denied");
    }
}

// Middleware to log user action with timestamp
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} request to ${req.url} by user: ${req.session?.user?.name || 'Guest'}`);
    next();
});



// Export the middleware functions so they can be used in other parts of the application
module.exports = { isAuthenticated, checkRole };
