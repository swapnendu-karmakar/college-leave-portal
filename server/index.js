
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
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.VITE_SMTP_USER,
      pass: process.env.VITE_SMTP_PASS,
    },
  });
};

// Routes
app.post('/api/send-credentials', async (req, res) => {
  const { email, name, password, role = 'MFT' } = req.body;

  if (!email || !name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.VITE_SMTP_FROM,
      to: email,
      subject: `Your ${role} Account Credentials - College Leave Portal`,
      html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 10px; }
                .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                .content { background-color: white; padding: 30px; border-radius: 0 0 10px 10px; }
                .credentials { background-color: #f0f0f0; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
                .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header"><h1>Welcome to College Leave Portal</h1></div>
                <div class="content">
                  <p>Dear ${name},</p>
                  <p>Your ${role} account has been created successfully.</p>
                  <div class="credentials">
                    <h3>Your Login Credentials:</h3>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Password:</strong> ${password}</p>
                  </div>
                  <p><strong>Important:</strong> Please change your password after your first login.</p>
                  <p>You can access the portal at: <a href="http://localhost:5173/faculty/login">Portal Login</a></p>
                  <p>Best regards,<br>College Leave Portal Team</p>
                </div>
                <div class="footer"><p>This is an automated email. Please do not reply.</p></div>
              </div>
            </body>
            </html>
            `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Credentials email sent:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending credentials email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

app.post('/api/send-rejection', async (req, res) => {
  const { email, studentName, enrollmentNumber, applicationId, divisionCode, reason } = req.body;

  if (!email || !studentName || !applicationId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const transporter = createTransporter();
    const mailOptions = {
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
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Rejection email sent:', info.messageId);
    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending rejection email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
