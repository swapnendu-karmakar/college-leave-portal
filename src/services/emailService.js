import nodemailer from 'nodemailer';

// Create transporter for Gmail
const createTransporter = () => {
    return nodemailer.createTransport({
        host: import.meta.env.VITE_SMTP_HOST,
        port: parseInt(import.meta.env.VITE_SMTP_PORT),
        secure: false, // true for 465, false for other ports
        auth: {
            user: import.meta.env.VITE_SMTP_USER,
            pass: import.meta.env.VITE_SMTP_PASS,
        },
    });
};

// Send MFT credentials email
export const sendMFTCredentials = async (mftEmail, mftName, password) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: import.meta.env.VITE_SMTP_FROM,
        to: mftEmail,
        subject: 'Your MFT Account Credentials - College Leave Portal',
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
              border-radius: 10px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .credentials {
              background-color: #f0f0f0;
              padding: 15px;
              border-left: 4px solid #4CAF50;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to College Leave Portal</h1>
            </div>
            <div class="content">
              <p>Dear ${mftName},</p>
              
              <p>Your MFT (My First Teacher) account has been created successfully. You can now access the College Leave Portal to review student leave applications.</p>
              
              <div class="credentials">
                <h3>Your Login Credentials:</h3>
                <p><strong>Email:</strong> ${mftEmail}</p>
                <p><strong>Password:</strong> ${password}</p>
              </div>
              
              <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
              
              <p>You can access the portal at: <a href="${window.location.origin}/faculty/login">Faculty Login</a></p>
              
              <p>If you have any questions or need assistance, please contact the administrator.</p>
              
              <p>Best regards,<br>College Leave Portal Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('MFT credentials email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending MFT credentials email:', error);
        throw error;
    }
};

// Send rejection notification email
export const sendRejectionNotification = async (
    facultyEmail,
    studentName,
    enrollmentNumber,
    applicationId,
    divisionCode,
    reason
) => {
    const transporter = createTransporter();

    const mailOptions = {
        from: import.meta.env.VITE_SMTP_FROM,
        to: facultyEmail,
        subject: `Leave Application Rejected - ${studentName} (${enrollmentNumber})`,
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
              border-radius: 10px;
            }
            .header {
              background-color: #f44336;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
            }
            .details {
              background-color: #fff3cd;
              padding: 15px;
              border-left: 4px solid #f44336;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #777;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Leave Application Rejected</h1>
            </div>
            <div class="content">
              <p>Dear Faculty Member,</p>
              
              <p>This is to inform you that a leave application has been <strong>rejected</strong> by the MFT. Please do not consider the proof and application for attendance records.</p>
              
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
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Rejection notification email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending rejection notification email:', error);
        throw error;
    }
};
