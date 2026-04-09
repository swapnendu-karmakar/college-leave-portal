const API_URL = import.meta.env.VITE_API_URL || '/api';

// Safe JSON parser — returns null if response is not JSON (e.g. 404 HTML page)
const safeJson = async (response) => {
    const text = await response.text();
    try { return JSON.parse(text); } catch { return null; }
};

/**
 * Send MFT login credentials (email + generated password) to an MFT user.
 * @param {string} mftEmail   - Recipient email address
 * @param {string} mftName    - Recipient display name
 * @param {string} password   - Plain-text password (NOT the hash)
 */
export const sendMFTCredentials = async (mftEmail, mftName, password) => {
    const response = await fetch(`${API_URL}/send-mft-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mftEmail, name: mftName, password }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
        throw new Error(
            data?.error ||
            `Server error ${response.status}: ${response.statusText}. Make sure your backend server is running and has the /api/send-mft-credentials route.`
        );
    }

    console.log('MFT credentials email sent:', data?.messageId);
    return { success: true, messageId: data?.messageId };
};

/**
 * Send rejection notification email to faculty.
 */
export const sendRejectionNotification = async (
    facultyEmail,
    studentName,
    enrollmentNumber,
    applicationId,
    divisionCode,
    reason
) => {
    const response = await fetch(`${API_URL}/send-rejection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: facultyEmail, studentName, enrollmentNumber, applicationId, divisionCode, reason }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
        throw new Error(data?.error || `Server error ${response.status}: ${response.statusText}`);
    }

    console.log('Rejection notification email sent:', data?.messageId);
    return { success: true, messageId: data?.messageId };
};

/**
 * Send verification OTP to student email.
 */
export const sendVerificationOTP = async (email, studentName) => {
    const response = await fetch(`${API_URL}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studentName }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
        throw new Error(data?.error || `Server error ${response.status}: ${response.statusText}`);
    }

    console.log('OTP sent successfully:', data?.messageId);
    return { success: true, messageId: data?.messageId, hash: data?.hash, expiresAt: data?.expiresAt };
};

/**
 * Verify OTP submitted by student.
 */
export const verifyOTP = async (email, otp, hash, expiresAt) => {
    const response = await fetch(`${API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, hash, expiresAt }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
        throw new Error(data?.error || `Server error ${response.status}: ${response.statusText}`);
    }

    return { success: true };
};

/**
 * Send notification email with PDF to a student (submitted, approved, or rejected).
 */
export const sendStudentNotification = async (
    email,
    studentName,
    applicationId,
    status,
    pdfBase64,
    facultyRemark = null
) => {
    const response = await fetch(`${API_URL}/send-student-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, studentName, applicationId, status, pdfBase64, facultyRemark }),
    });

    const data = await safeJson(response);

    if (!response.ok) {
        throw new Error(data?.error || `Server error ${response.status}: ${response.statusText}`);
    }

    console.log(`Student notification (${status}) email sent:`, data?.messageId);
    return { success: true, messageId: data?.messageId };
};