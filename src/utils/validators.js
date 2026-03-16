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

// ============= EXCEL UPLOAD UTILITIES =============
import * as XLSX from 'xlsx';

// Normalize a single header string to lowercase snake_case
const normalizeHeader = (h) => {
    return h.toString().trim().toLowerCase().replace(/\s+/g, '_');
};

/**
 * Normalize raw Excel rows AND apply column aliases so that
 * regardless of what the user named their columns, we always
 * produce the canonical field names the rest of the code expects.
 *
 * Alias map (key = what user might write → value = canonical name):
 *   division          → division_code
 *   division_name     → division_code
 *   dept_code         → department_code
 *   branch_code       → branch_code   (keep as-is, but also accept department_code)
 *   department_code   → branch_code   (Data sheet uses department_code as the branch/program code)
 *   enrollment_no     → enrollment_number
 *   enroll_number     → enrollment_number
 *   enroll            → enrollment_number
 *   batch             → batch_number
 *   div_code          → division_code
 *   div               → division_code
 */
const COLUMN_ALIASES = {
    // division variants
    division:           'division_code',
    division_name:      'division_code',
    div_code:           'division_code',
    div:                'division_code',

    // branch/department code variants
    // In the Data sheet the program code comes as "department_code" but
    // our Branch objects need "branch_code".
    department_code:    'branch_code',
    dept_code:          'branch_code',

    // enrollment variants
    enrollment_no:      'enrollment_number',
    enroll_number:      'enrollment_number',
    enroll:             'enrollment_number',

    // batch variants
    batch:              'batch_number',
};

export const normalizeRows = (rows) => {
    if (!rows || rows.length === 0) return [];
    return rows.map((row) => {
        const normalized = {};
        Object.keys(row).forEach((key) => {
            const normKey = normalizeHeader(key);
            // Apply alias if one exists, otherwise keep normalized key
            const canonicalKey = COLUMN_ALIASES[normKey] || normKey;
            const value = row[key];
            // Convert to string but preserve empty as empty string
            normalized[canonicalKey] = value !== null && value !== undefined ? String(value).trim() : '';
        });
        return normalized;
    });
};

/**
 * Parse Excel file.
 * Sheet layout expected from users:
 *   - First sheet ("Data"): one row per division describing the full hierarchy
 *   - Sheets named after a division code (e.g. "8CSE1"): student rows
 *   - Sheets named {divisionCode}_faculty (e.g. "8CSE1_faculty"): faculty rows
 */
export const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // --- Main "Data" sheet: hierarchy only ---
                const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
                const mainRows = XLSX.utils.sheet_to_json(mainSheet, { defval: '' });
                const normalized = normalizeRows(mainRows);

                // Deduplicate helper
                const uniqueBy = (arr, keyFn) => {
                    const seen = new Set();
                    return arr.filter((item) => {
                        const key = keyFn(item);
                        if (!key || seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    });
                };

                const sheets = {};

                // Colleges
                const colleges = uniqueBy(
                    normalized.filter((r) => r.college_name && r.college_code),
                    (r) => r.college_code.toLowerCase()
                ).map((r) => ({ name: r.college_name, code: r.college_code }));
                if (colleges.length > 0) sheets['Colleges'] = colleges;

                // Departments
                const departments = uniqueBy(
                    normalized.filter((r) => r.department_name && r.college_code),
                    (r) => `${r.department_name}|${r.college_code}`.toLowerCase()
                ).map((r) => ({ name: r.department_name, college_code: r.college_code }));
                if (departments.length > 0) sheets['Departments'] = departments;

                // Branches — accepts branch_code OR the aliased department_code
                // branch_name can be branch_name or the raw "branch_name" column
                const branches = uniqueBy(
                    normalized.filter((r) => (r.branch_name || r.branch) && (r.branch_code)),
                    (r) => r.branch_code.toLowerCase()
                ).map((r) => ({
                    name: r.branch_name || r.branch,
                    code: r.branch_code,
                    department: r.department_name,
                }));
                if (branches.length > 0) sheets['Branches'] = branches;

                // MFT
                const mfts = uniqueBy(
                    normalized.filter((r) => r.mft_name && r.mft_email),
                    (r) => r.mft_email.toLowerCase()
                ).map((r) => ({ name: r.mft_name, email: r.mft_email }));
                if (mfts.length > 0) sheets['MFT'] = mfts;

                // Divisions — "division_code" is the canonical name (aliased from "division")
                // batch_number defaults to 1 if missing since the sample Excel doesn't include it
                const divisions = uniqueBy(
                    normalized.filter((r) => r.division_code),
                    (r) => r.division_code.toLowerCase()
                ).map((r) => ({
                    code: r.division_code,
                    semester: r.semester,
                    batch_number: r.batch_number || '1',   // ← default to 1 if blank
                    branch_code: r.branch_code,
                    mft_email: r.mft_email,
                }));
                if (divisions.length > 0) sheets['Divisions'] = divisions;

                // --- Additional sheets: students and faculty ---
                const allStudents = [];
                const allFaculty = [];

                for (let i = 1; i < workbook.SheetNames.length; i++) {
                    const sheetName = workbook.SheetNames[i];
                    const ws = workbook.Sheets[sheetName];
                    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                    const normalizedRows = normalizeRows(rows);

                    if (sheetName.toLowerCase().endsWith('_faculty')) {
                        // Faculty sheet
                        const divCode = sheetName.replace(/_faculty$/i, '');
                        normalizedRows.forEach((r) => {
                            if (r.name && r.email) {
                                allFaculty.push({
                                    name: r.name,
                                    email: r.email,
                                    // prefer explicit column, fall back to sheet name
                                    division_code: r.division_code || divCode,
                                });
                            }
                        });
                    } else {
                        // Student sheet — sheet name IS the division code
                        const divCode = sheetName;
                        normalizedRows.forEach((r) => {
                            if (r.enrollment_number || r.name) {
                                allStudents.push({
                                    enrollment_number: r.enrollment_number,
                                    name: r.name,
                                    email: r.email,
                                    // prefer explicit column (division_code or aliased "division"), fall back to sheet name
                                    division_code: r.division_code || divCode,
                                });
                            }
                        });
                    }
                }

                if (allStudents.length > 0) sheets['Students'] = allStudents;
                if (allFaculty.length > 0) sheets['Faculty'] = allFaculty;

                const ENTITY_ORDER = ['Colleges', 'Departments', 'Branches', 'MFT', 'Divisions', 'Students', 'Faculty'];
                const sheetNames = ENTITY_ORDER.filter((t) => sheets[t] && sheets[t].length > 0);
                resolve({ sheetNames, sheets });
            } catch (err) {
                reject(new Error('Failed to parse Excel file: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
};

// Validate and prepare Colleges data
export const validateCollegesData = (rows) => {
    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.name) errors.push('Missing name');
        if (!row.code) errors.push('Missing code');
        results.push({
            rowIndex: idx + 2,
            data: { name: row.name || '', code: row.code || '' },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

// Validate and prepare Departments data
export const validateDepartmentsData = (rows, colleges) => {
    const collegeMap = {};
    colleges.forEach((c) => {
        if (c.code) collegeMap[String(c.code).trim().toLowerCase()] = c.id;
        if (c.name) collegeMap[String(c.name).trim().toLowerCase()] = c.id;
    });

    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.name) errors.push('Missing name');
        const collegeKey = String(row.college_code || row.college || '').trim().toLowerCase();
        const collegeId = collegeMap[collegeKey];
        if (!collegeId) errors.push(`College not found: "${row.college_code || row.college || ''}"`);
        results.push({
            rowIndex: idx + 2,
            data: { name: row.name || '', college_id: collegeId },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

// Validate and prepare Branches data
export const validateBranchesData = (rows, departments) => {
    const deptMap = {};
    departments.forEach((d) => {
        if (d.name) deptMap[String(d.name).trim().toLowerCase()] = d.id;
    });

    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.name) errors.push('Missing name');
        if (!row.code) errors.push('Missing code');
        const deptKey = String(row.department || row.department_name || '').trim().toLowerCase();
        const deptId = deptMap[deptKey];
        if (!deptId) errors.push(`Department not found: "${row.department || row.department_name || ''}"`);
        results.push({
            rowIndex: idx + 2,
            data: { name: row.name || '', code: row.code || '', department_id: deptId },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

// Validate and prepare Divisions data
export const validateDivisionsData = (rows, branches, mfts) => {
    const branchMap = {};
    branches.forEach((b) => {
        if (b.code) branchMap[String(b.code).trim().toLowerCase()] = b.id;
        if (b.name) branchMap[String(b.name).trim().toLowerCase()] = b.id;
    });
    const mftMap = {};
    mfts.forEach((m) => {
        if (m.email) mftMap[String(m.email).trim().toLowerCase()] = m.id;
        if (m.name) mftMap[String(m.name).trim().toLowerCase()] = m.id;
    });

    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.code) errors.push('Missing code');
        if (!row.semester) errors.push('Missing semester');

        // batch_number is optional — default to 1
        const batchNumber = parseInt(row.batch_number) || 1;

        const branchKey = String(row.branch_code || row.branch || '').trim().toLowerCase();
        const branchId = branchMap[branchKey];
        if (!branchId) errors.push(`Branch not found: "${row.branch_code || row.branch || ''}"`);

        let mftId = null;
        if (row.mft_email || row.mft) {
            const mftKey = String(row.mft_email || row.mft || '').trim().toLowerCase();
            mftId = mftMap[mftKey] || null;
            if (!mftId) errors.push(`MFT not found: "${row.mft_email || row.mft || ''}"`);
        }

        results.push({
            rowIndex: idx + 2,
            data: {
                code: row.code || '',
                semester: parseInt(row.semester) || 0,
                batch_number: batchNumber,
                branch_id: branchId,
                mft_id: mftId,
            },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

// Validate and prepare Students data
export const validateStudentsData = (rows, divisionsMap) => {
    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.enrollment_number) errors.push('Missing enrollment_number');
        if (!row.name) errors.push('Missing name');
        if (!row.email) errors.push('Missing email');

        // division_code is already canonicalized by normalizeRows (handles "division" alias)
        const divCode = String(row.division_code || '').trim().toLowerCase();
        const divId = divisionsMap[divCode];
        if (!divId) errors.push(`Division not found: "${row.division_code || ''}"`);

        results.push({
            rowIndex: idx + 2,
            data: {
                enrollment_number: String(row.enrollment_number || '').trim(),
                name: row.name || '',
                email: row.email || '',
                division_id: divId,
            },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

// Validate and prepare Faculty data
export const validateFacultyData = (rows, divisionsMap) => {
    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.name) errors.push('Missing name');
        if (!row.email) errors.push('Missing email');

        // division_code is already canonicalized by normalizeRows (handles "division" alias)
        const divCode = String(row.division_code || '').trim().toLowerCase();
        const divId = divisionsMap[divCode];
        if (!divId) errors.push(`Division not found: "${row.division_code || ''}"`);

        results.push({
            rowIndex: idx + 2,
            data: {
                name: row.name || '',
                email: row.email || '',
                division_id: divId,
            },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

// Validate and prepare MFT data
export const validateMFTData = (rows) => {
    const results = [];
    rows.forEach((row, idx) => {
        const errors = [];
        if (!row.name) errors.push('Missing name');
        if (!row.email) errors.push('Missing email');
        results.push({
            rowIndex: idx + 2,
            data: { name: row.name || '', email: row.email || '' },
            errors,
            valid: errors.length === 0,
        });
    });
    return results;
};

/**
 * Generate and download template Excel file.
 * Matches the layout users actually upload:
 *   - "Data" sheet: hierarchy (college → department → branch → division → MFT)
 *   - "{division_code}" sheets: students
 *   - "{division_code}_faculty" sheets: faculty
 *
 * Column names match exactly what parseExcelFile/normalizeRows expects
 * (including aliases so users can use either form).
 */
export const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Helper: auto-size columns
    const autoSize = (ws, headers, rows) => {
        ws['!cols'] = headers.map((h) => {
            const maxLen = Math.max(h.length, ...rows.map((r) => String(r[h] || '').length));
            return { wch: Math.min(maxLen + 2, 40) };
        });
    };

    // === Data sheet ===
    // Uses the canonical column names (branch_code instead of department_code,
    // division_code instead of division) so users know what's expected.
    const dataHeaders = [
        'college_name', 'college_code', 'department_name',
        'branch_name', 'branch_code',
        'division_code', 'semester', 'batch_number',
        'mft_name', 'mft_email',
    ];
    const dataRows = [
        {
            college_name: 'Parul Institute of Technology', college_code: 'PIT',
            department_name: 'Computer Science',
            branch_name: 'CSE', branch_code: 'CSE',
            division_code: '8CSE1', semester: 8, batch_number: 1,
            mft_name: 'Dr. Sharma', mft_email: 'sharma@paruluniversity.ac.in',
        },
        {
            college_name: 'Parul Institute of Technology', college_code: 'PIT',
            department_name: 'Information Technology',
            branch_name: 'IT', branch_code: 'IT',
            division_code: '6IT1', semester: 6, batch_number: 1,
            mft_name: 'Prof. Patel', mft_email: 'patel@paruluniversity.ac.in',
        },
    ];
    const dataWs = XLSX.utils.json_to_sheet(dataRows, { header: dataHeaders });
    autoSize(dataWs, dataHeaders, dataRows);
    XLSX.utils.book_append_sheet(wb, dataWs, 'Data');

    // === Student sheets ===
    const studentHeaders = ['enrollment_number', 'name', 'email', 'division_code'];

    const students8CSE1 = [
        { enrollment_number: '2203051240001', name: 'Rahul Kumar', email: 'rahul@paruluniversity.ac.in', division_code: '8CSE1' },
        { enrollment_number: '2203051240002', name: 'Priya Singh', email: 'priya@paruluniversity.ac.in', division_code: '8CSE1' },
    ];
    const ws8CSE1 = XLSX.utils.json_to_sheet(students8CSE1, { header: studentHeaders });
    autoSize(ws8CSE1, studentHeaders, students8CSE1);
    XLSX.utils.book_append_sheet(wb, ws8CSE1, '8CSE1');

    const students6IT1 = [
        { enrollment_number: '2203051240003', name: 'Amit Patel', email: 'amit@paruluniversity.ac.in', division_code: '6IT1' },
    ];
    const ws6IT1 = XLSX.utils.json_to_sheet(students6IT1, { header: studentHeaders });
    autoSize(ws6IT1, studentHeaders, students6IT1);
    XLSX.utils.book_append_sheet(wb, ws6IT1, '6IT1');

    // === Faculty sheets ===
    const facultyHeaders = ['name', 'email', 'division_code', 'subject'];

    const faculty8CSE1 = [
        { name: 'Prof. Mehta', email: 'mehta@paruluniversity.ac.in', division_code: '8CSE1', subject: 'Compiler Design' },
    ];
    const wsF8CSE1 = XLSX.utils.json_to_sheet(faculty8CSE1, { header: facultyHeaders });
    autoSize(wsF8CSE1, facultyHeaders, faculty8CSE1);
    XLSX.utils.book_append_sheet(wb, wsF8CSE1, '8CSE1_faculty');

    const faculty6IT1 = [
        { name: 'Prof. Verma', email: 'verma@paruluniversity.ac.in', division_code: '6IT1', subject: 'IT Fundamentals' },
    ];
    const wsF6IT1 = XLSX.utils.json_to_sheet(faculty6IT1, { header: facultyHeaders });
    autoSize(wsF6IT1, facultyHeaders, faculty6IT1);
    XLSX.utils.book_append_sheet(wb, wsF6IT1, '6IT1_faculty');

    XLSX.writeFile(wb, 'leave_portal_template.xlsx');
};