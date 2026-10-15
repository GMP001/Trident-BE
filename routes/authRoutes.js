//D:/Trident Log/Trident-BE/routes/authRoutes.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const { validateLogin, validateCreateAdmin } = require('../validators/authValidator');

// ============================================================
// POST /api/auth/login
// Public - Authenticate user and return tokens
// ============================================================
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user by email (uid)
        const result = await db.query(
            'SELECT id, uid, full_name, password_hash, role FROM admins WHERE uid = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const admin = result.rows[0];

        // Compare password with hash
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate access token (4 hours)
        const accessToken = jwt.sign(
            {
                id: admin.id,
                uid: admin.uid,
                role: admin.role,
                full_name: admin.full_name
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRY || '4h' }
        );

        // Generate refresh token (7 days)
        const refreshToken = jwt.sign(
            {
                id: admin.id,
                uid: admin.uid,
                role: admin.role
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        );

        // Store refresh token in database
        await db.query(
            'UPDATE admins SET refresh_token = $1 WHERE id = $2',
            [refreshToken, admin.id]
        );

        console.log(`✅ Login successful: ${admin.uid} (${admin.role})`);

        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: admin.id,
                uid: admin.uid,
                full_name: admin.full_name,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// POST /api/auth/refresh-token
// Public - Get new access token using refresh token
// ============================================================
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token is required' });
        }

        // Verify the refresh token
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch (err) {
            return res.status(403).json({ error: 'Invalid or expired refresh token' });
        }

        // Check if refresh token exists in database
        const result = await db.query(
            'SELECT id, uid, full_name, role, refresh_token FROM admins WHERE id = $1 AND refresh_token = $2',
            [decoded.id, refreshToken]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({ error: 'Refresh token not recognized' });
        }

        const admin = result.rows[0];

        // Generate new access token
        const newAccessToken = jwt.sign(
            {
                id: admin.id,
                uid: admin.uid,
                role: admin.role,
                full_name: admin.full_name
            },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: process.env.JWT_ACCESS_EXPIRY || '4h' }
        );

        // Generate new refresh token (rotate)
        const newRefreshToken = jwt.sign(
            {
                id: admin.id,
                uid: admin.uid,
                role: admin.role
            },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
        );

        // Update refresh token in database
        await db.query(
            'UPDATE admins SET refresh_token = $1 WHERE id = $2',
            [newRefreshToken, admin.id]
        );

        console.log(`✅ Token refreshed: ${admin.uid}`);

        res.json({
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// POST /api/auth/logout
// Protected - Clear refresh token
// ============================================================
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        await db.query(
            'UPDATE admins SET refresh_token = NULL WHERE id = $1',
            [req.user.id]
        );

        console.log(`✅ Logout: ${req.user.uid}`);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// POST /api/auth/create-admin
// Protected - Only super_admin can create new admin users
// ============================================================
router.post('/create-admin', authenticateToken, authorizeRoles('super_admin'), validateCreateAdmin, async (req, res) => {
    
    try {
        const { email, full_name, password, role } = req.body;

        // Validate required fields
        if (!email || !full_name || !password || !role) {
            return res.status(400).json({
                error: 'All fields are required: email, full_name, password, role'
            });
        }

        // Validate role
        const allowedRoles = ['admin', 'end_user'];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                error: `Invalid role. Allowed: ${allowedRoles.join(', ')}`
            });
        }

        // Check if user already exists
        const existingUser = await db.query(
            'SELECT id FROM admins WHERE uid = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'A user with this email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Insert new admin
        const result = await db.query(
            'INSERT INTO admins (uid, full_name, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, uid, full_name, role, created_at',
            [email, full_name, password_hash, role]
        );

        const newAdmin = result.rows[0];

        console.log(`✅ New admin created: ${newAdmin.uid} (${newAdmin.role}) by ${req.user.uid}`);

        res.status(201).json({
            success: true,
            message: 'Admin user created successfully',
            user: newAdmin
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================
// GET /api/auth/verify
// Protected - Verify token is valid (for frontend auth check)
// ============================================================
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            uid: req.user.uid,
            full_name: req.user.full_name,
            role: req.user.role
        }
    });
});

module.exports = router;
