import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Config
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Email Transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.VITE_SMTP_HOST,
    port: parseInt(process.env.VITE_SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.VITE_SMTP_USER,
      pass: process.env.VITE_SMTP_PASS,
    },
  });
};

// In-memory OTP storage: { email: { otp: string, expiresAt: number } }
const otpStore = new Map();

// Helper to generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ─────────────────────────────────────────────
// POST /api/send-otp
// ─────────────────────────────────────────────
app.post('/api/send-otp', async (req, res) => {
  const { email, studentName } = req.body;

  if (!email || !studentName) {
    return res.status(400).json({ error: 'Missing email or student name' });
  }

  const otp = generateOTP();
  otpStore.set(email, {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: `Your OTP for Leave Application - College Leave Portal`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
            .header { background-color: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background-color: #f5f3ff; border: 2px dashed #8b5cf6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #8b5cf6; margin: 20px 0; border-radius: 10px; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>College Leave Portal Verification</h1></div>
            <div class="content">
              <p>Dear ${studentName},</p>
              <p>You requested to verify your identity to submit a leave application.</p>
              <p>Here is your One-Time Password (OTP):</p>
              <div class="otp-box">${otp}</div>
              <p>This code will expire in <strong>5 minutes</strong>. Do not share this code with anyone.</p>
              <p>If you did not request this, please ignore this email.</p>
              <p>Best regards,<br>College Leave Portal Team</p>
            </div>
            <div class="footer"><p>This is an automated email. Please do not reply.</p></div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`OTP sent to ${email} (Message ID: ${info.messageId})`);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    res.status(500).json({ error: 'Failed to send OTP email' });
  }
});

// ─────────────────────────────────────────────
// POST /api/verify-otp
// ─────────────────────────────────────────────
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: 'Missing email or OTP' });
  }

  const storedData = otpStore.get(email);

  if (!storedData) {
    return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });
  }

  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(email);
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (storedData.otp !== otp) {
    return res.status(400).json({ error: 'Invalid OTP format or incorrect code.' });
  }

  otpStore.delete(email);
  res.status(200).json({ success: true, message: 'OTP verified successfully' });
});

// ─────────────────────────────────────────────
// POST /api/send-mft-credentials
// Sends admin-generated login credentials to an MFT user.
// Body: { email, name, password }
// ─────────────────────────────────────────────
app.post('/api/send-mft-credentials', async (req, res) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Missing required fields: email, name, password' });
  }

  try {
    const transporter = createTransporter();
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/faculty/login`;

    const info = await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: `Your MFT Login Credentials - College Leave Portal`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
            .header { background-color: #e11d48; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials-box {
              background-color: #fff1f2;
              border: 1px solid #fecdd3;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
            }
            .credentials-box p { margin: 8px 0; font-size: 15px; }
            .password-chip {
              display: inline-block;
              font-family: monospace;
              font-size: 17px;
              font-weight: bold;
              letter-spacing: 3px;
              background: #fff;
              border: 1.5px solid #fda4af;
              border-radius: 6px;
              padding: 4px 14px;
              margin-left: 6px;
              color: #be123c;
            }
            .login-btn {
              display: inline-block;
              padding: 13px 28px;
              background-color: #e11d48;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              font-size: 15px;
              margin: 20px 0;
            }
            .warning {
              background-color: #fffbeb;
              border-left: 4px solid #f59e0b;
              padding: 12px 16px;
              border-radius: 4px;
              font-size: 13px;
              color: #92400e;
              margin-top: 20px;
            }
            .footer { text-align: center; margin-top: 24px; color: #9ca3af; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">College Leave Portal</h1>
              <p style="margin:6px 0 0; font-size:14px; opacity:0.9;">Your MFT Account is Ready</p>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              <p>Your administrator has created your MFT account on the College Leave Portal. Use the credentials below to log in.</p>

              <div class="credentials-box">
                <p><strong>📧 Email:</strong> ${email}</p>
                <p><strong>🔑 Password:</strong> <span class="password-chip">${password}</span></p>
              </div>

              <div style="text-align: center;">
                <a href="${loginUrl}" class="login-btn">Login to Portal →</a>
              </div>

              <p style="font-size:13px; color:#6b7280;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${loginUrl}" style="color:#e11d48; word-break:break-all;">${loginUrl}</a>
              </p>

              <div class="warning">
                ⚠️ <strong>Security notice:</strong> Please change your password after your first login. Do not share these credentials with anyone.
              </div>

              <p style="margin-top:24px;">Best regards,<br/>College Leave Portal Team</p>
            </div>
            <div class="footer"><p>This is an automated email. Please do not reply.</p></div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`MFT credentials sent to ${email} (Message ID: ${info.messageId})`);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending MFT credentials email:', error);
    res.status(500).json({ error: 'Failed to send credentials email' });
  }
});

// ─────────────────────────────────────────────
// POST /api/send-rejection
// ─────────────────────────────────────────────
app.post('/api/send-rejection', async (req, res) => {
  const { email, studentName, enrollmentNumber, applicationId, divisionCode, reason } = req.body;

  if (!email || !studentName || !applicationId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: `Leave Application Rejected - ${studentName} (${enrollmentNumber})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
            .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background-color: #fff3cd; padding: 15px; border-left: 4px solid #f44336; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>Leave Application Rejected</h1></div>
            <div class="content">
              <p>Dear Faculty Member,</p>
              <p>This is to inform you that a leave application has been <strong>rejected</strong> by the MFT.</p>
              <div class="details">
                <h3>Application Details:</h3>
                <p><strong>Student Name:</strong> ${studentName}</p>
                <p><strong>Enrollment Number:</strong> ${enrollmentNumber}</p>
                <p><strong>Application ID:</strong> ${applicationId}</p>
                <p><strong>Division:</strong> ${divisionCode}</p>
                <p><strong>Reason:</strong> ${reason}</p>
              </div>
              <p><strong>Action Required:</strong> Please ensure this application is not considered for attendance evaluation.</p>
              <p>Best regards,<br>College Leave Portal System</p>
            </div>
            <div class="footer"><p>This is an automated email. Please do not reply.</p></div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('Rejection email sent:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending rejection email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Start server locally
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;