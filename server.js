const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const contentRoutes = require('./routes/contentRoutes');
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/upload');

// Initialize Express
const app = express();

// ========== IMPORTANT: ORDER MATTERS ==========

// 1. CORS first
app.use(cors());

// 2. Serve static files (MUST come before JSON middleware)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/data', express.static('data'));

// 3. JSON and URL encoded middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Increase body size limit for large video uploads
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// 4. Routes
app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/upload', uploadRoutes);  // Upload route AFTER json middleware

// 5. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Trident Backend is running' });
});

// 6. Error handling middleware (always last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Admin API: http://localhost:${PORT}/api/health`);
  console.log(`📁 Uploads served from: http://localhost:${PORT}/uploads`);
});
