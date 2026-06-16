const express = require('express');
const router = express.Router();

// Simple authentication (in production, use proper JWT and hashing)
const VALID_USERS = [
  { email: 'admin@trident.com', password: 'Trident2024!', role: 'admin' },
  { email: 'editor@trident.com', password: 'Edit2024!', role: 'editor' }
];

// ============================================================
// POST /api/auth/login - Login
// ============================================================
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = VALID_USERS.find(u => u.email === email && u.password === password);
  
  if (user) {
    // Generate a token
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    res.json({
      success: true,
      token: token,
      user: { email: user.email, role: user.role }
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

// ============================================================
// POST /api/auth/verify - Verify token (POST method)
// ============================================================
router.post('/verify', (req, res) => {
  const token = req.body.token || req.headers.authorization?.split(' ')[1];
  
  if (token) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// ============================================================
// GET /api/auth/verify - Verify token (GET method - for frontend compatibility)
// ============================================================
router.get('/verify', (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

module.exports = router;
