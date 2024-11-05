// config.js
const dotenv = require('dotenv');
const path = require('path');

const ENV = process.env.NODE_ENV || 'local';

dotenv.config({
  path: path.resolve(__dirname, `.env.${ENV}`)
});

const config = {
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  // Add other configurations here
};

module.exports = config;
