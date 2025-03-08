// config/redis.js

const redis = require('redis');

// Hardcoded Redis credentials and port
const redisClient = redis.createClient({
    host: '127.0.0.1',              // Replace with your Redis server host if different
    port: 6379,                     // Replace with your Redis server port if different
    // password: '' // Replace with your Redis password if set; omit or leave blank if not required
});

// Handle Redis client events
redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
});

redisClient.on('ready', () => {
    console.log('Connected to Redis successfully.');
});

redisClient.on('error', (err) => {
    console.error('Redis error encountered:', err);
    process.exit(1); // Exits the process so PM2 can restart it
  });

module.exports = redisClient;
