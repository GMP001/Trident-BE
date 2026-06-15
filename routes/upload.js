const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter - allow both images and videos
const fileFilter = (req, file, cb) => {
  // Allowed image formats
  const imageTypes = /jpeg|jpg|png|gif|webp/;
  // Allowed video formats
  const videoTypes = /mp4|webm|mov|avi|mkv/;
  
  const extname = path.extname(file.originalname).toLowerCase();
  const isImage = imageTypes.test(extname) && imageTypes.test(file.mimetype);
  const isVideo = videoTypes.test(extname) && file.mimetype.startsWith('video/');
  
  if (isImage || isVideo) {
    return cb(null, true);
  } else {
    cb(new Error('Only image (jpg, png, gif, webp) or video (mp4, webm, mov) files are allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit for larger full HD videos
  fileFilter: fileFilter
});

// Middleware to verify auth token
const verifyAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Upload endpoint
router.post('/', verifyAuth, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    
    res.json({ 
      success: true, 
      filePath: filePath,
      filename: req.file.filename,
      fileType: fileType,
      message: `${fileType} uploaded successfully` 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router;
