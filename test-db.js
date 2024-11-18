// test-db.js
const { queryAsync } = require('./config/db');

async function testConnection() {
    try {
        const results = await queryAsync('SELECT 1 + 1 AS solution');
        console.log('Database connection successful:', results);
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

testConnection();
