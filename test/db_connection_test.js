// test/db_connection_test.js

const { queryAsync } = require('../config/db');

(async () => {
    try {
        const results = await queryAsync('SELECT 1 + 1 AS solution', []);
        console.log('Database Connection Successful:', results);
    } catch (error) {
        console.error('Database Connection Failed:', error.message);
    }
})();
