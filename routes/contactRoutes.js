const express = require('express');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const router = express.Router();
const contentFilePath = path.join(__dirname, '..', 'data', 'content.json');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ============================================================
// POST /api/contact - Book a consultation
// ============================================================
router.post('/', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      companyName,
      date,
      time,
      topic,
      additionalNotes,
    } = req.body;

    // Read recipient emails from content.json
    const content = JSON.parse(fs.readFileSync(contentFilePath, 'utf8'));
    const recipients = content.globalSettings?.contactRecipients || [];

    if (recipients.length === 0) {
      recipients.push('golammdpasha@gmail.com');
    }

    // Save booking to log file
    const bookingsDir = path.join(__dirname, '..', 'data', 'bookings');
    if (!fs.existsSync(bookingsDir)) {
      fs.mkdirSync(bookingsDir, { recursive: true });
    }
    const bookingData = { ...req.body, submittedAt: new Date().toISOString() };
    fs.writeFileSync(
      path.join(bookingsDir, `booking-${Date.now()}.json`),
      JSON.stringify(bookingData, null, 2)
    );

    // Build email HTML
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="background: #0284c7; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📅 New Consultation Booking</h1>
          <p style="color: #e0f2fe; margin: 8px 0 0 0;">Trident Global Logistics</p>
        </div>
        
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f0f9ff;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 40%;">👤 Name</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold;">${name || 'N/A'}</td></tr>
            <tr style="background: #f0f9ff;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">📧 Email</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #0284c7;"><a href="mailto:${email}" style="color: #0284c7;">${email || 'N/A'}</a></td></tr>
            <tr style="background: #f0f9ff;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">📞 Phone</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;"><a href="tel:${phone}" style="color: #111827;">${phone || 'N/A'}</a></td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">🏢 Company</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${companyName || 'N/A'}</td></tr>
            <tr style="background: #fef3c7;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">📅 Date</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold; font-size: 16px;">${date || 'N/A'}</td></tr>
            <tr style="background: #fef3c7;"><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">⏰ Time</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: bold; font-size: 16px;">${time || 'N/A'}</td></tr>
            <tr><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">📋 Topic</td><td style="padding: 10px; border-bottom: 1px solid #e5e7eb; color: #111827;">${topic || 'General Consultation'}</td></tr>
            <tr><td style="padding: 10px; font-weight: bold; color: #374151;">📝 Notes</td><td style="padding: 10px; color: #111827;">${additionalNotes || 'None'}</td></tr>
          </table>
        </div>
        
        <div style="background: #f9fafb; padding: 16px; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">This consultation was booked via the Trident Global Logistics website.</p>
          <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 12px;">Date: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Trident Global Logistics" <${process.env.EMAIL_FROM || 'noreply@tgllbd.com'}>`,
      to: recipients.join(', '),
      replyTo: email,
      subject: `New Consultation: ${date} at ${time} | ${name || 'Unknown'} | ${companyName || 'Unknown Company'}`,
      html: emailHTML,
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Consultation booking email sent to: ${recipients.join(', ')}`);

    res.json({
      success: true,
      message: 'Consultation booked successfully! We will confirm your appointment shortly.',
    });
  } catch (error) {
    console.error('Error booking consultation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book consultation. Please try again or contact us directly.',
    });
  }
});

// ============================================================
// GET /api/contact/booked-slots - Get booked date/time slots
// ============================================================
router.get('/booked-slots', (req, res) => {
  try {
    const bookingsDir = path.join(__dirname, '..', 'data', 'bookings');
    if (!fs.existsSync(bookingsDir)) {
      return res.json({ bookedSlots: [] });
    }

    const files = fs.readdirSync(bookingsDir);
    const bookedSlots = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(bookingsDir, file), 'utf8'));
      return { date: data.date, time: data.time };
    });

    res.json({ bookedSlots });
  } catch (error) {
    res.json({ bookedSlots: [] });
  }
});


module.exports = router;
