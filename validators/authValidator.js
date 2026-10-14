const { z } = require('zod');

const loginSchema = z.object({
    email:    z.string().trim().email().max(200),
    password: z.string().min(6).max(200),
});

const validateLogin = (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        // Return the SAME generic error the code already returns
        // so we don't leak which emails exist
        return res.status(400).json({ error: 'Email and password are required' });
    }
    req.body = result.data;
    next();
};

// Optional — use on the protected create-admin route
const createAdminSchema = z.object({
    email:     z.string().trim().email().max(200),
    full_name: z.string().trim().min(2).max(120),
    password:  z.string().min(8).max(200),
    role:      z.enum(['admin', 'end_user']),
});

const validateCreateAdmin = (req, res, next) => {
    const result = createAdminSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({
            error: 'Invalid input',
            details: result.error.issues.map(i => ({
                field: i.path.join('.'),
                message: i.message,
            })),
        });
    }
    req.body = result.data;
    next();
};

module.exports = { validateLogin, validateCreateAdmin };
