const { z } = require('zod');

// Reusable pieces
const shortText   = z.string().trim().max(200).optional().or(z.literal(''));
const longText    = z.string().trim().max(5000).optional().or(z.literal(''));
const numericish  = z.union([z.number(), z.string().trim().max(50)])
                      .optional()
                      .nullable();
const stringArray = z.array(z.string().trim().max(100))
                      .max(20)
                      .optional()
                      .default([]);

const quoteSchema = z.object({
    // Contact info
    name:                   z.string().trim().min(2).max(120),
    email:                  z.string().trim().email().max(200),
    phone:                  shortText,
    companyName:            shortText,

    // Shipment info
    origin:                 z.string().trim().min(2).max(200),
    destination:            z.string().trim().min(2).max(200),
    modeOfTransport:        stringArray,
    cargoType:              stringArray,
    shipmentTerms:          stringArray,
    grossWeight:            numericish,
    volume:                 numericish,
    targetRate:             numericish,
    targetDestinationTerms: shortText,
    additionalNotes:        longText,
});

const validateQuote = (req, res, next) => {
    const result = quoteSchema.safeParse(req.body);
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

module.exports = { validateQuote };
