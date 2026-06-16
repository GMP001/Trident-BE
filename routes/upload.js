const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadDir);
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Double-check directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// ===== FIXED: File filter - allow images (including AVIF) and videos =====
const fileFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype.toLowerCase();
  
  // Allowed image MIME types
  const allowedImageMimes = [
    'image/jpeg',
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/avif'
  ];
  
  // Allowed video MIME types
  const allowedVideoMimes = [
    'video/mp4',
    'video/webm',
    'video/quicktime',  // .mov files
    'video/x-msvideo',  // .avi files
    'video/x-matroska'  // .mkv files
  ];
  
  const isImage = allowedImageMimes.includes(mimetype);
  const isVideo = allowedVideoMimes.includes(mimetype);
  
  if (isImage || isVideo) {
    console.log(`✅ File accepted: ${file.originalname} (${mimetype})`);
    cb(null, true);
  } else {
    console.error(`❌ File rejected: ${file.originalname} (${mimetype})`);
    cb(new Error(`File type not allowed: ${mimetype}. Allowed: JPG, PNG, GIF, WebP, AVIF, MP4, WebM, MOV, AVI, MKV`), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit
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

// ===== FIXED: Upload endpoint - multer error handling wrapped properly =====
router.post('/', verifyAuth, (req, res) => {
  // Use multer as middleware inside the route handler
  upload.single('image')(req, res, function (err) {
    // Handle multer errors FIRST
    if (err) {
      console.error('❌ Upload error:', err.message);
      
      if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 300MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ error: 'Unexpected file field. Use "image" as the field name.' });
        }
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      }
      
      // Custom errors (like file filter rejection)
      return res.status(400).json({ error: err.message });
    }
    
    // Check if file was received
    if (!req.file) {
      console.error('❌ No file received');
      return res.status(400).json({ error: 'No file uploaded. Make sure you selected a file.' });
    }
    
    // Success!
    const filePath = `/uploads/${req.file.filename}`;
    const fileType = req.file.mimetype.startsWith('video/') ? 'Video' : 'Image';
    
    console.log(`✅ ${fileType} uploaded: ${req.file.originalname} → ${req.file.filename}`);
    console.log(`   Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
    
    res.json({ 
      success: true, 
      filePath: filePath,
      filename: req.file.filename,
      fileType: fileType,
      message: `${fileType} uploaded successfully` 
    });
  });
});

module.exports = router;
