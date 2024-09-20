const mysql = require('mysql');
const util = require('util');

// Create a MySQL connection pool
const pool = mysql.createPool({
    connectionLimit: 15, // Maximum number of connections
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'web1'
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

// Handle error events
pool.on('error', (err) => {
    console.error('Unexpected error on idle connection:', err);
    process.exit(1);
});

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
