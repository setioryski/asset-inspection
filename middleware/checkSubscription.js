// middleware/checkSubscription.js

const Subscription = require('../models/Subscription');

const checkSubscription = async (req, res, next) => {
    if (!req.session.isAuthenticated) {
        return res.redirect('/login');
    }

    try {
        const subscriptions = await Subscription.findByUserId(req.session.user.id);
        console.log(`User ${req.session.user.name} has ${subscriptions.length} subscriptions.`);
        if (subscriptions.length === 0) {
            // No subscription found, redirect to subscription prompt
            return res.redirect('/subscription');
        }
        next();
    } catch (error) {
        console.error('Error checking subscription:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = checkSubscription;
