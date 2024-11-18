// queue.js
const Bull = require('bull');

// Initialize Bull queue with Redis configuration
const uploadQueue = new Bull('upload-queue', {
    redis: {
        host: '127.0.0.1', // Redis server host
        port: 6379,        // Redis server port
        // password: 'your_redis_password', // Uncomment if Redis requires authentication
    },
    // Optional settings
    limiter: {
        max: 5,          // Maximum number of jobs processed per duration
        duration: 1000,  // Duration in milliseconds
    },
});

module.exports = { uploadQueue };
