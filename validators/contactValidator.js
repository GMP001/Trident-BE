const { z } = require('zod');

const shortText = z.string().trim().max(200).optional().or(z.literal(''));
const longText  = z.string().trim().max(5000).optional().or(z.literal(''));

const bookingSchema = z.object({
    name:            z.string().trim().min(2).max(120),
    email:           z.string().trim().email().max(200),
    phone:           shortText,
    companyName:     shortText,
    date:            z.string().trim().min(1).max(40),   // booking date (required)
    time:            z.string().trim().min(1).max(40),   // booking time (required)
    topic:           shortText,
    additionalNotes: longText,
});

const validateBooking = (req, res, next) => {
    const result = bookingSchema.safeParse(req.body);
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

module.exports = { validateBooking };
