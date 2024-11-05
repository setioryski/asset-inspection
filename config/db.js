// db.js
const mysql = require('mysql');
const util = require('util');
const config = require('../config');

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // Delay in milliseconds (2 seconds)

// Create a MySQL connection pool with retry logic
let pool;

function createPool() {
  pool = mysql.createPool({
    connectionLimit: 15,
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database
  });

  // Promisify the query function for async/await
  pool.query = util.promisify(pool.query);

  // Handle connection events
  pool.on('connection', (connection) => {
    console.log('New connection established with ID:', connection.threadId);
  });

  pool.on('acquire', (connection) => {
    console.log('Connection %d acquired', connection.threadId);
  });

  pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
  });

  // Handle unexpected errors
  pool.on('error', (err) => {
    console.error('Unexpected error on idle connection:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.fatal) {
      console.log('Attempting to reconnect...');
      retryConnection();
    } else {
      process.exit(1);
    }
  });
}

// Retry logic
async function retryConnection(retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Attempting to reconnect (Attempt ${i + 1}/${retries})...`);
      await pool.getConnection();
      console.log('Database reconnected successfully');
      return;
    } catch (err) {
      console.error('Connection failed. Retrying in', RETRY_DELAY, 'ms');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
    }
  }
  console.error('Failed to reconnect to database after multiple attempts.');
  process.exit(1);
}

// Initialize the pool with retry support
createPool();

// Helper function to execute SQL queries
async function queryAsync(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (err) {
    console.error('Error executing query:', err.message);
    throw err; // Re-throw to handle in the calling function
  }
}

module.exports = {
  pool,
  queryAsync
};
