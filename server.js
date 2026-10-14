// D:/Trident Log/Trident-BE/server.js

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const helmet      = require('helmet');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');

// Import routes
const authRoutes    = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const contactRoutes = require('./routes/contactRoutes');
const quoteRoutes   = require('./routes/quoteRoutes');
const uploadRoutes  = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ============================================================
// 1. Uploads directory
// ============================================================
const uploadDir = path.resolve(
    process.env.UPLOAD_DIR || path.join(__dirname, 'uploads')
);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ============================================================
// 2. Trust proxy (nginx / load balancer)
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// 3. Security headers + compression + rate limiter definitions
// ============================================================
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // enable later once asset hosts are known
}));

app.use(compression());

// Global API limiter — 300 requests / 15 min per IP
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

// Strict limiter for auth + public form submissions
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

app.use('/api', globalLimiter);

// ============================================================
// 4. CORS
// ============================================================
const allowedOrigins = (isProd
    ? [process.env.FRONTEND_URL, 'https://tgllbd.com', 'https://www.tgllbd.com']
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5000']
).filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// 5. Body parsers
// ============================================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================================
// 6. Static uploads
// ============================================================
app.use('/uploads', express.static(uploadDir, {
    maxAge: '30d',
    setHeaders: (res) =>
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

// ============================================================
// 7. Strict rate limits on sensitive endpoints
//    MUST be BEFORE the routers below
// ============================================================
app.use('/api/auth/login', strictLimiter);
app.use('/api/quote', (req, res, next) => {
    if (req.method === 'POST') return strictLimiter(req, res, next);
    next();
});
app.use('/api/contact', (req, res, next) => {
    if (req.method === 'POST') return strictLimiter(req, res, next);
    next();
});

// ============================================================
// 8. API routes
// ============================================================
app.use('/api/auth',    authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/quote',   quoteRoutes);
app.use('/api/upload',  uploadRoutes);

// ============================================================
// 9. Health check
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Trident Backend is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

// ============================================================
// 10. API 404 — MUST come before SPA fallback
// ============================================================
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
});

// ============================================================
// 11. SPA fallback (production only)
// ============================================================
if (isProd) {
    const frontendPath = process.env.FRONTEND_PATH
        || path.join(__dirname, '..', 'Trident-FE', 'dist');

    if (fs.existsSync(frontendPath)) {
        app.use(express.static(frontendPath, { maxAge: '1y', index: false }));

        app.get(/^\/(?!api).*/, (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });

        console.log('📦 Serving frontend from:', frontendPath);
    } else {
        console.warn('⚠️  Frontend build not found at:', frontendPath);
    }
}

// ============================================================
// 12. Global error handler — MUST be last
// ============================================================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 300MB.' });
    }
    if (err.message && err.message.startsWith('CORS blocked')) {
        return res.status(403).json({ error: err.message });
    }

    res.status(500).json({ error: 'Internal server error' });
});

// ============================================================
// 13. Start
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
