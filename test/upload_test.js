// test/upload_test.js
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');


// Configuration
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/upload';
const CONCURRENT_UPLOADS = parseInt(process.env.CONCURRENT_UPLOADS) || 20;
const TEST_IMAGE_PATH = process.env.TEST_IMAGE_PATH || path.join(__dirname, 'images', 'test_image.jpg');
const AUTH_TOKEN = process.env.AUTH_TOKEN || ''; // Replace with your actual token if needed

// Function to perform a single upload
const performUpload = async (uploadNumber) => {
    try {
        const form = new FormData();

        // Append required fields
        form.append('catatan', `Test note ${uploadNumber}`);
        form.append('id_user', `user_${uploadNumber}`);
        form.append('id_tipe_aset', '1'); // Example value
        form.append('id_tipe_lantai', '1'); // Example value
        form.append('id_kondisi', '1'); // Example value
        form.append('id_tipe_hb', '1'); // Example value
        form.append('id_tipe_door', '1'); // Example value
        form.append('clientTimestamp', new Date().toISOString());

        // Append the file
        form.append('foto', fs.createReadStream(TEST_IMAGE_PATH));

        // Send the POST request
        const response = await axios.post(SERVER_URL, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : undefined, // Include if needed
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        if (error.response) {
            // Server responded with a status code out of 2xx
            return { success: false, status: error.response.status, data: error.response.data };
        } else {
            // Other errors
            return { success: false, message: error.message };
        }
    }
};

// Function to run multiple uploads concurrently
const runUploads = async () => {
    console.log(`Starting ${CONCURRENT_UPLOADS} concurrent uploads to ${SERVER_URL}`);
    console.log(`Using test image: ${TEST_IMAGE_PATH}`);
    console.log(`Using AUTH_TOKEN: ${AUTH_TOKEN ? 'Provided' : 'Not provided'}`);

    const uploadPromises = [];
    for (let i = 1; i <= CONCURRENT_UPLOADS; i++) {
        uploadPromises.push(performUpload(i));
    }

    const results = await Promise.all(uploadPromises);

    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
        if (result.success) {
            successCount++;
            console.log(`Upload ${index + 1}: Success (Status: ${result.status})`);
        } else {
            failureCount++;
            console.log(`Upload ${index + 1}: Failed (${result.status || 'N/A'}) - ${result.message || JSON.stringify(result.data)}`);
        }
    });

    console.log(`\nUpload Test Completed: ${successCount} succeeded, ${failureCount} failed.`);
};

// Check if test image exists
if (!fs.existsSync(TEST_IMAGE_PATH)) {
    console.error(`Test image not found at path: ${TEST_IMAGE_PATH}`);
    console.error('Please provide a valid test image.');
    process.exit(1);
}

// Run the uploads
runUploads();
