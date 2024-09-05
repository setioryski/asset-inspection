const Bull = require('bull');
const multer = require('multer');
const sharp = require('sharp');
const { queryAsync } = require('../config/db'); // Update path based on your project structure
const redis = require('redis');

// Setup Redis and Bull Queue
const redisClient = redis.createClient();
const formProcessingQueue = new Bull('form-processing', {
    redis: redisClient
});

// Multer configuration for file uploads (memory storage)
const upload = multer({ storage: multer.memoryStorage() });

// Process jobs from the queue (runs in the background)
formProcessingQueue.process(async (job) => {
    const { formData, fileBuffer, fileName } = job.data;

    // Process the file (resize, compress, etc.)
    const resizedImagePath = `uploads/resized-${Date.now()}-${fileName}`;
    await sharp(fileBuffer)
        .resize(800)
        .jpeg({ quality: 70 })
        .toFile(resizedImagePath);

    // Insert form data into the database
    const query = `
        INSERT INTO aset (
            foto, id_kondisi, catatan, id_user, id_tipe_aset, id_tipe_lantai, id_tipe_hb, id_tipe_door
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const queryValues = [
        resizedImagePath,
        formData.id_kondisi,
        formData.catatan,
        formData.id_user,
        formData.id_tipe_aset,
        formData.id_tipe_lantai,
        formData.id_tipe_hb,
        formData.id_tipe_door
    ];
    await queryAsync(query, queryValues);

    return { success: true, message: 'Form processed and data saved' };
});

// Form submission route (use this in your index.js)
const handleFormSubmission = (app) => {
    app.post('/submit-inspection', upload.single('foto'), async (req, res) => {
        const formData = req.body;

        try {
            // Add the form data and file to the queue for background processing
            await formProcessingQueue.add({
                formData,
                fileBuffer: req.file.buffer,
                fileName: req.file.originalname
            });

            // Respond to the user that the form was received
            res.status(200).json({ success: true, message: 'Form received and processing in the background.' });
        } catch (error) {
            console.error('Error adding job to queue:', error);
            res.status(500).json({ success: false, message: 'Failed to process form submission.' });
        }
    });
};

// Export the function to be used in index.js
module.exports = { handleFormSubmission };
