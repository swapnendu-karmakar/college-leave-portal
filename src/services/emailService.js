// API base URL
const API_URL = 'http://localhost:3000/api';

// Send MFT credentials email
export const sendMFTCredentials = async (mftEmail, mftName, password, role = 'MFT') => {
  try {
    const response = await fetch(`${API_URL}/send-credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: mftEmail,
        name: mftName,
        password: password,
        role: role,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    const data = await response.json();
    console.log('MFT credentials email sent:', data.messageId);
    return { success: true, messageId: data.messageId };
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
  try {
    const response = await fetch(`${API_URL}/send-rejection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: facultyEmail,
        studentName,
        enrollmentNumber,
        applicationId,
        divisionCode,
        reason,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send email');
    }

    const data = await response.json();
    console.log('Rejection notification email sent:', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('Error sending rejection notification email:', error);
    throw error;
  }
};
