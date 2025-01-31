// __tests__/upload.test.js

const request = require('supertest');
const express = require('express');
const multer = require('multer');
const path = require('path');

// Import the route
const dashboardRoute = require('../routes/dashboard');

// Create an instance of Express for testing
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Mock Middleware (isAuthenticated, checkRole, uploadLimiter)
jest.mock('../authMiddleware', () => ({
  isAuthenticated: (req, res, next) => next(),
  checkRole: (roles) => (req, res, next) => next(),
}));

jest.mock('../config/db', () => ({
  queryAsync: jest.fn(),
}));

// Mock the imageProcessingQueue
jest.mock('../imageProcessingQueue', () => ({
  push: jest.fn(),
}));

// Mock the fs module
jest.mock('fs', () => ({
  unlink: jest.fn((path, callback) => callback(null)),
}));

const { queryAsync } = require('../config/db');
const imageProcessingQueue = require('../imageProcessingQueue');
const fs = require('fs');

// Use Multer with memory storage for testing
const upload = multer({ storage: multer.memoryStorage() });

// Attach the route to the app
app.use('/', dashboardRoute);

// Helper function to create a dummy image buffer
const createDummyImage = () => Buffer.from('dummy image content');

describe('POST /upload', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should successfully upload and process image', async () => {
    // Mock the imageProcessingQueue to call the callback without error
    imageProcessingQueue.push.mockImplementation((task, callback) => {
      callback(null);
    });

    // Mock the database insertion to resolve successfully
    queryAsync.mockResolvedValueOnce({ insertId: 1 });

    const response = await request(app)
      .post('/upload')
      .field('catatan', 'Test note')
      .field('id_user', '1')
      .field('id_tipe_aset', '2')
      .field('id_tipe_lantai', '3')
      .field('id_kondisi', 'Good')
      .field('clientTimestamp', new Date().toISOString())
      .attach('foto', createDummyImage(), 'test.jpg');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Form submitted successfully!' });

    // Verify that imageProcessingQueue.push was called with correct arguments
    expect(imageProcessingQueue.push).toHaveBeenCalledTimes(1);
    expect(imageProcessingQueue.push).toHaveBeenCalledWith(
      { filePath: expect.any(String) },
      expect.any(Function)
    );

    // Verify that queryAsync was called with correct SQL and parameters
    expect(queryAsync).toHaveBeenCalledTimes(1);
    expect(queryAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO aset'),
      expect.arrayContaining([
        'processed/test.jpg', // Assuming path.basename('test.jpg') is 'test.jpg'
        'Good',
        'Test note',
        '1',
        '2',
        '3',
        undefined, // id_tipe_hb is not provided
        undefined, // id_tipe_door is not provided
        expect.any(Date),
      ])
    );
  });

  test('should fail when required fields are missing', async () => {
    const response = await request(app)
      .post('/upload')
      .field('catatan', 'Test note')
      // Missing id_user, id_tipe_aset, id_tipe_lantai, id_kondisi
      .attach('foto', createDummyImage(), 'test.jpg');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Missing required fields.' });

    // Verify that fs.unlink was called to delete the uploaded file
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(expect.any(String), expect.any(Function));

    // Ensure that imageProcessingQueue.push and queryAsync were not called
    expect(imageProcessingQueue.push).not.toHaveBeenCalled();
    expect(queryAsync).not.toHaveBeenCalled();
  });

  test('should fail when clientTimestamp is invalid', async () => {
    const response = await request(app)
      .post('/upload')
      .field('catatan', 'Test note')
      .field('id_user', '1')
      .field('id_tipe_aset', '2')
      .field('id_tipe_lantai', '3')
      .field('id_kondisi', 'Good')
      .field('clientTimestamp', 'invalid-timestamp')
      .attach('foto', createDummyImage(), 'test.jpg');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'Invalid client timestamp.' });

    // Verify that fs.unlink was called to delete the uploaded file
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(expect.any(String), expect.any(Function));

    // Ensure that imageProcessingQueue.push and queryAsync were not called
    expect(imageProcessingQueue.push).not.toHaveBeenCalled();
    expect(queryAsync).not.toHaveBeenCalled();
  });

  test('should handle image processing failure', async () => {
    // Mock the imageProcessingQueue to call the callback with an error
    imageProcessingQueue.push.mockImplementation((task, callback) => {
      callback(new Error('Image processing failed'));
    });

    const response = await request(app)
      .post('/upload')
      .field('catatan', 'Test note')
      .field('id_user', '1')
      .field('id_tipe_aset', '2')
      .field('id_tipe_lantai', '3')
      .field('id_kondisi', 'Good')
      .field('clientTimestamp', new Date().toISOString())
      .attach('foto', createDummyImage(), 'test.jpg');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Image processing failed.' });

    // Verify that imageProcessingQueue.push was called
    expect(imageProcessingQueue.push).toHaveBeenCalledTimes(1);

    // Verify that fs.unlink was called to delete the original file
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith(expect.any(String), expect.any(Function));

    // Ensure that queryAsync was not called
    expect(queryAsync).not.toHaveBeenCalled();
  });

  test('should handle database insertion failure', async () => {
    // Mock the imageProcessingQueue to call the callback without error
    imageProcessingQueue.push.mockImplementation((task, callback) => {
      callback(null);
    });

    // Mock the database insertion to reject with an error
    queryAsync.mockRejectedValueOnce(new Error('Database insertion failed'));

    const response = await request(app)
      .post('/upload')
      .field('catatan', 'Test note')
      .field('id_user', '1')
      .field('id_tipe_aset', '2')
      .field('id_tipe_lantai', '3')
      .field('id_kondisi', 'Good')
      .field('clientTimestamp', new Date().toISOString())
      .attach('foto', createDummyImage(), 'test.jpg');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ success: false, message: 'Internal Server Error' });

    // Verify that imageProcessingQueue.push was called
    expect(imageProcessingQueue.push).toHaveBeenCalledTimes(1);

    // Verify that queryAsync was called
    expect(queryAsync).toHaveBeenCalledTimes(1);

    // Verify that fs.unlink was called to delete the processed file
    expect(fs.unlink).toHaveBeenCalledTimes(1);
    expect(fs.unlink).toHaveBeenCalledWith('processed/test.jpg', expect.any(Function));
  });
});
