// worker.js
const { uploadQueue } = require('./queue');
const sharp = require('sharp');
const fs = require('fs');
const { queryAsync } = require('.config/db'); // Your database utility

// Process jobs with limited concurrency to manage resources
uploadQueue.process(3, async (job) => { // Adjust concurrency as needed
    const {
        originalImagePath,
        resizedImagePath,
        catatan,
        id_user,
        id_tipe_aset,
        id_tipe_lantai,
        id_kondisi,
        id_tipe_hb,
        id_tipe_door,
        timestamp
    } = job.data;

    try {
        console.log(`Processing job for image: ${originalImagePath}`);

        // Image processing: Resize and save
        await sharp(originalImagePath)
            .rotate() // Adjust based on EXIF data
            .resize(800) // Resize to 800px width
            .jpeg({ quality: 70 }) // Convert to JPEG with 70% quality
            .toFile(resizedImagePath);

        console.log(`Resized image saved at: ${resizedImagePath}`);

        // Insert into the database
        await queryAsync(`
            INSERT INTO aset (
                foto, id_kondisi, catatan, id_user, id_tipe_aset,
                id_tipe_lantai, id_tipe_hb, id_tipe_door, client_timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            resizedImagePath, id_kondisi, catatan, id_user, id_tipe_aset,
            id_tipe_lantai, id_tipe_hb, id_tipe_door, timestamp
        ]);

        console.log('Database entry created successfully.');

        // Clean up temporary files
        fs.unlinkSync(originalImagePath);    // Delete original file
        // Optionally delete the resized image on failure; here we keep it

        return { success: true, message: 'Job processed successfully!' };
    } catch (error) {
        console.error('Error processing job:', error);

        // Cleanup in case of error
        if (fs.existsSync(originalImagePath)) {
            fs.unlinkSync(originalImagePath);
        }
        if (fs.existsSync(resizedImagePath)) {
            fs.unlinkSync(resizedImagePath);
        }

        throw error; // Let Bull handle retries
    }
});

// Optional: Listen to global events for logging
uploadQueue.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed.`);
});

uploadQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error: ${err.message}`);
});

console.log('Worker is running and listening for jobs...');
