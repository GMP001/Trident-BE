//D:/Trident Log/Trident-BE/routes/upload.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

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
        // Generate unique filename: timestamp-random.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// File filter - allow images (including AVIF, WebP) and videos
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
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska'
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
    limits: { fileSize: 300 * 1024 * 1024 }, // 300MB max
    fileFilter: fileFilter
});

// ============================================================
// POST /api/upload
// Protected (admin) - Upload a file
// Body: multipart/form-data with field name "image"
// Optional body field: "oldFilePath" - path of old file to delete
// ============================================================
router.post('/', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
    upload.single('image')(req, res, function (err) {
        // Handle multer errors first
        if (err) {
            console.error('❌ Upload error:', err.message);

            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({ error: 'File too large. Maximum size is 300MB.' });
                }
                if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                    return res.status(400).json({ error: 'Unexpected file field. Use "image" as the field name.' });
                }
                return res.status(400).json({ error: `Upload error: ${err.message}` });
            }

            // Custom errors (file filter rejection)
            return res.status(400).json({ error: err.message });
        }

        // Check if file was received
        if (!req.file) {
            console.error('❌ No file received');
            return res.status(400).json({ error: 'No file uploaded. Please select a file.' });
        }

        // Delete old file if path provided
        const oldFilePath = req.body.oldFilePath;
        if (oldFilePath) {
            // Extract just the filename from the old path
            const oldFilename = oldFilePath.replace('/uploads/', '');
            const oldFileFullPath = path.join(uploadDir, oldFilename);

            if (fs.existsSync(oldFileFullPath)) {
                try {
                    fs.unlinkSync(oldFileFullPath);
                    console.log(`🗑️  Deleted old file: ${oldFilename}`);
                } catch (deleteErr) {
                    console.error(`⚠️  Failed to delete old file: ${oldFilename}`, deleteErr);
                }
            }
        }

        // Success
        const filePath = `/uploads/${req.file.filename}`;
        const fileType = req.file.mimetype.startsWith('video/') ? 'Video' : 'Image';
        const fileSizeMB = (req.file.size / 1024 / 1024).toFixed(2);

        console.log(`✅ ${fileType} uploaded: ${req.file.originalname} → ${req.file.filename} (${fileSizeMB} MB)`);
        console.log(`   Uploaded by: ${req.user.uid}`);

        res.json({
            success: true,
            filePath: filePath,
            filename: req.file.filename,
            originalName: req.file.originalname,
            fileType: fileType,
            fileSize: fileSizeMB + ' MB',
            message: `${fileType} uploaded successfully`
        });
    });
});

// ============================================================
// DELETE /api/upload
// Protected (admin) - Delete a file by path
// Body: { "filePath": "/uploads/filename.jpg" }
// ============================================================
router.delete('/', authenticateToken, authorizeRoles('super_admin', 'admin'), (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        // Prevent directory traversal attacks
        const filename = path.basename(filePath);
        const fullPath = path.join(uploadDir, filename);

        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        fs.unlinkSync(fullPath);

        console.log(`🗑️  File deleted: ${filename} by ${req.user.uid}`);

        res.json({
            success: true,
            message: 'File deleted successfully',
            filename: filename
        });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

module.exports = router;
