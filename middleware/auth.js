const jwt = require('jsonwebtoken');

/**
 * Middleware: Authenticate JWT access token
 * Attaches decoded user to req.user if valid
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    error: 'Token expired', 
                    code: 'TOKEN_EXPIRED' 
                });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user; // { id, uid, role, full_name }
        next();
    });
};

/**
 * Middleware: Authorize by role(s)
 * @param  {...string} roles - Allowed roles (e.g., 'super_admin', 'admin')
 * Usage: authorizeRoles('super_admin') or authorizeRoles('super_admin', 'admin')
 */
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Insufficient permissions. Required role: ' + roles.join(' or ') 
            });
        }
        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };
