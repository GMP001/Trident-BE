//D:/Trident Log/Trident-BE/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const contactRoutes = require('./routes/contactRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const uploadRoutes = require('./routes/upload');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// 1. Create required directories
// ============================================================
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Created uploads directory:', uploadDir);
}

// ============================================================
// 2. CORS Configuration
// ============================================================
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL, 'https://tgllbd.com', 'https://www.tgllbd.com']
        : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// ============================================================
// 3. Body parsing middleware (BEFORE routes)
// ============================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================
// 4. Serve static files
// ============================================================
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============================================================
// 5. API Routes
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quote', quoteRoutes);
app.use('/api/upload', uploadRoutes);

// ============================================================
// 6. Health check endpoint
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Trident Backend is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    });
});

// ============================================================
// 7. Serve frontend in production
// ============================================================
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '..', 'Trident-FE', 'dist');
    
    if (fs.existsSync(frontendPath)) {
        app.use(express.static(frontendPath));
        
        // SPA fallback - all non-API routes serve index.html
        app.get('*', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
        
        console.log('📦 Serving frontend from:', frontendPath);
    } else {
        console.log('⚠️  Frontend build not found at:', frontendPath);
        console.log('   Run "npm run build" in Trident-FE folder first');
    }
}

// ============================================================
// 8. 404 handler for unmatched API routes
// ============================================================
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// ============================================================
// 9. Global error handling middleware
// ============================================================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    
    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 300MB.' });
    }
    
    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// 10. Start server
// ============================================================
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Trident Backend Server Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Port:        ${PORT}`);
    console.log(`📍 Health:      http://localhost:${PORT}/api/health`);
    console.log(`📍 Uploads:     http://localhost:${PORT}/uploads`);
    console.log(`📍 Database:    ${process.env.DB_NAME || 'trident_db'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
});
