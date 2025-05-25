const multer = require('multer');

module.exports = (error, req, res, next) => {
  console.error('Error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
    return res.status(400).json({ error: 'Upload error' });
  }

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }

  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
};