const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();
const contentFilePath = path.join(__dirname, '..', 'data', 'content.json');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================================
// POST /api/quote - Submit a quote request
// ============================================================
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      origin,
      destination,
      modeOfTransport,
      cargoType,
      shipmentTerms,
      grossWeight,
      volume,
      targetRate,
      targetDestinationTerms,
      companyName,
      additionalNotes,
    } = req.body;

    // Read recipient emails from content.json
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    const recipients = content.globalSettings?.quoteRecipients || [];

    // Fallback if no recipients configured
    if (recipients.length === 0) {
      recipients.push('golammdpasha@gmail.com');
    }

    // Build email HTML
    const emailHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background: #0284c7; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Quote Request</h1>
        <p style="color: #e0f2fe; margin: 8px 0 0 0;">Trident Global Logistics</p>
        </div>
        
        <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f0f9ff;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 40%;">👤 Requester Name</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold;">${name || 'N/A'}</td></tr>
                <tr style="background: #f0f9ff;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">📧 Email</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #0284c7;"><a href="mailto:${email}" style="color: #0284c7;">${email || 'N/A'}</a></td></tr>
                <tr style="background: #f0f9ff;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">📞 Phone</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;"><a href="tel:${phone}" style="color: #111827;">${phone || 'N/A'}</a></td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 40%;">Origin</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${origin}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Destination</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${destination}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Mode of Transport</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${modeOfTransport || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Cargo Type</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${cargoType || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Shipment Terms</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${shipmentTerms || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Gross Weight (KG)</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${grossWeight || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Volume (CBM)</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${volume || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Target Rate</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${targetRate || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Destination Terms</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${targetDestinationTerms || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Company Name</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${companyName || 'N/A'}</td></tr>
                <tr><td style="padding: 10px; font-weight: bold; color: #374151;">Additional Notes</td><td style="padding: 10px; color: #111827;">${additionalNotes || 'None'}</td></tr>
            </table>
            </div>
            
            <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">This quote request was submitted via the Trident Global Logistics website.</p>
            <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
            </div>
        </div>
        `;

    // Save quote to a log file
    const quotesDir = path.join(__dirname, '..', 'data', 'quotes');
    if (!fs.existsSync(quotesDir)) {
    fs.mkdirSync(quotesDir, { recursive: true });
    }
    const quoteData = {
    ...req.body,
    submittedAt: new Date().toISOString(),
    ip: req.ip,
    };
    const filename = `quote-${Date.now()}.json`;
    fs.writeFileSync(
    path.join(quotesDir, filename),
    JSON.stringify(quoteData, null, 2)
    );

    // Send email to all recipients
    const mailOptions = {
      from: `"Trident Global Logistics" <${process.env.EMAIL_FROM || 'noreply@tgllbd.com'}>`,
      to: recipients.join(', '),
      subject: `New Quote Request: ${origin} → ${destination} | ${name || 'Unknown'} | ${companyName || 'Unknown Company'}`,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Quote request email sent to: ${recipients.join(', ')}`);

    res.json({
      success: true,
      message: 'Quote request submitted successfully! Our team will contact you within 1 business day.',
    });
  } catch (error) {
    console.error('Error submitting quote:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit quote request. Please try again or contact us directly.',
    });
  }
});

module.exports = router;
