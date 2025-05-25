const path = require('path');

// Ensure PORT is properly set
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

module.exports = {
  PORT,
  NODE_ENV: process.env.NODE_ENV || 'development',
  UPLOAD_DIR: path.join(__dirname, '..', 'uploads'),
  OUTPUT_DIR: path.join(__dirname, '..', 'output'),
  PUBLIC_DIR: path.join(__dirname, '..', 'public'),
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  SESSION_TIMEOUT: 60 * 60 * 1000,  // 1 hour
};