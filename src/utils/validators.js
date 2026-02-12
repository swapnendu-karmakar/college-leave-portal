import bcrypt from 'bcryptjs';

// Validate college email
export const validateCollegeEmail = (email) => {
    const domain = import.meta.env.VITE_COLLEGE_EMAIL_DOMAIN;
    return email.endsWith(domain);
};

// Validate enrollment number format (basic validation)
export const validateEnrollmentNumber = (enrollment) => {
    // Assuming format like: 2203051240100
    return /^\d{13}$/.test(enrollment);
};

// Hash password
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
};

// Compare password
export const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Generate random password
export const generatePassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
};

// Validate date range
export const validateDateRange = (fromDate, toDate) => {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from > to) {
        return { valid: false, message: 'From date must be before or equal to To date' };
    }

    return { valid: true };
};

// Format date for display
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Parse CSV file for bulk student upload
export const parseCSV = (csvText) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const students = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
            const student = {};
            headers.forEach((header, index) => {
                student[header] = values[index];
            });
            students.push(student);
        }
    }

    return students;
};

// Validate file type for proof upload
export const validateFileType = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
        return { valid: false, message: 'Only JPG, PNG, and PDF files are allowed' };
    }

    if (file.size > maxSize) {
        return { valid: false, message: 'File size must be less than 5MB' };
    }

    return { valid: true };
};

// Get status badge color
export const getStatusColor = (status) => {
    switch (status) {
        case 'pending':
            return 'orange';
        case 'approved':
            return 'green';
        case 'rejected':
            return 'red';
        default:
            return 'gray';
    }
};

// Get proof status text
export const getProofStatusText = (status) => {
    switch (status) {
        case 'not_submitted':
            return 'Not Submitted';
        case 'submitted':
            return 'Under Review';
        case 'approved':
            return 'Approved';
        case 'rejected':
            return 'Rejected';
        default:
            return 'Unknown';
    }
};
