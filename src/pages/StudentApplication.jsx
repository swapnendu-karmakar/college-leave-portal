import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, User, Mail, Calendar, MessageSquare, Upload, Send,
    AlertCircle, CheckCircle2, Trash2, Link as LinkIcon, Eye,
    KeyRound, ChevronRight, School, Building2, GraduationCap, Users
} from 'lucide-react';
import FileUpload from '../components/shared/FileUpload';
import {
    getStudentFullDetails,
    createLeaveApplication,
    createProof,
    deleteStorageFile,
    getApplicationById,
} from '../services/supabase';
import { sendVerificationOTP, verifyOTP, sendStudentNotification } from '../services/emailService';
import { validateDateRange } from '../utils/validators';
import { generateApplicationPDF } from '../utils/pdfGenerator';

const StudentApplication = () => {
    const navigate = useNavigate();

    // Wizard Steps: 1 (Enrollment), 2 (OTP), 3 (Application Form)
    const [step, setStep] = useState(1);

    // Step 1 State
    const [enrollmentNumber, setEnrollmentNumber] = useState('');
    const [studentDetails, setStudentDetails] = useState(null);

    // Step 2 State
    const [otpCode, setOtpCode] = useState('');
    const [otpSentTime, setOtpSentTime] = useState(null);
    const [otpHash, setOtpHash] = useState(null);
    const [otpExpiresAt, setOtpExpiresAt] = useState(null);

    // Step 3 State
    const [formData, setFormData] = useState({
        reason: '',
        leaveType: '',
        fromDate: '',
        toDate: '',
    });
    const [categoryDetails, setCategoryDetails] = useState({});
    const [uploadedProofs, setUploadedProofs] = useState([]);

    // General State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const maskEmail = (email) => {
        if (!email) return '';
        const [name, domain] = email.split('@');
        if (name.length <= 2) return `${name[0]}***@${domain}`;
        return `${name[0]}${name[1]}***${name[name.length - 1]}@${domain}`;
    };

    // --- Actions ---

    // Step 1 -> 2
    const handleVerifyEnrollment = async (e) => {
        e.preventDefault();
        if (!enrollmentNumber.trim()) {
            setError('Please enter your enrollment number.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Fetch student full details
            const student = await getStudentFullDetails(enrollmentNumber);
            if (!student) {
                setError('Student not found. Please check your enrollment number.');
                return;
            }

            setStudentDetails(student);

            // Send OTP
            const response = await sendVerificationOTP(student.email, student.name);
            setOtpHash(response.hash);
            setOtpExpiresAt(response.expiresAt);
            setOtpSentTime(Date.now());
            setStep(2);
            setSuccess(`OTP sent to your registered email (${maskEmail(student.email)})`);
            setTimeout(() => setSuccess(''), 5000);

        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to verify enrollment or send OTP.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 Resend OTP
    const handleResendOTP = async () => {
        if (!studentDetails) return;
        try {
            setLoading(true);
            setError('');
            const response = await sendVerificationOTP(studentDetails.email, studentDetails.name);
            setOtpHash(response.hash);
            setOtpExpiresAt(response.expiresAt);
            setOtpSentTime(Date.now());
            setSuccess('A new OTP has been sent to your email.');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.message || 'Failed to resend OTP.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2 -> 3
    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (!otpCode || otpCode.length !== 6) {
            setError('Please enter a valid 6-digit OTP.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await verifyOTP(studentDetails.email, otpCode, otpHash, otpExpiresAt);

            setStep(3);
            setSuccess('Identity verified successfully! Please fill in your leave details.');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(err.message || 'Invalid OTP.');
        } finally {
            setLoading(false);
        }
    };

    // Step 3 Actions
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'leaveType') {
            setCategoryDetails({});
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleCategoryDetailChange = (e) => {
        const { name, value } = e.target;
        setCategoryDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleProofUpload = (proofData) => {
        setUploadedProofs(prev => [...prev, proofData]);
        setSuccess('Proof attached successfully!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleRemoveProof = async (index) => {
        const proofToRemove = uploadedProofs[index];
        try {
            await deleteStorageFile(proofToRemove.filePath);
            setUploadedProofs(prev => prev.filter((_, i) => i !== index));
            setSuccess('Proof removed successfully.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to remove file from storage, but removed from list.');
            setUploadedProofs(prev => prev.filter((_, i) => i !== index));
        }
    };

    const validateForm = () => {
        if (!formData.leaveType || !formData.reason) {
            setError('Please select leave type and provide reason');
            return false;
        }
        if (!formData.fromDate || !formData.toDate) {
            setError('Please select leave dates');
            return false;
        }
        const dateValidation = validateDateRange(formData.fromDate, formData.toDate);
        if (!dateValidation.valid) {
            setError(dateValidation.message);
            return false;
        }
        return true;
    };

    const handleSubmitApplication = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setLoading(true);
            setError('');

            // At this point studentDetails has everything we need
            const { division } = studentDetails;
            const branch = division.branch;
            const department = branch.department;
            const college = department.college;

            const application = await createLeaveApplication({
                enrollment_number: studentDetails.enrollment_number,
                student_name: studentDetails.name,
                email: studentDetails.email,
                college_id: college.id,
                department_id: department.id,
                branch_id: branch.id,
                division_id: division.id,
                mft_id: division.mft_id,
                reason: formData.reason,
                leave_type: formData.leaveType,
                from_date: formData.fromDate,
                to_date: formData.toDate,
                category_details: categoryDetails,
                status: 'pending',
                proof_status: uploadedProofs.length > 0 ? 'submitted' : 'not_submitted',
            });

            if (uploadedProofs.length > 0) {
                await Promise.all(uploadedProofs.map(proof =>
                    createProof({
                        application_id: application.id,
                        file_url: proof.publicUrl,
                        file_name: proof.fileName,
                        status: 'pending',
                    })
                ));
            }

            try {
                const fullApp = await getApplicationById(application.application_id);
                const pdfBase64 = generateApplicationPDF(fullApp, 'datauristring');
                await sendStudentNotification(
                    studentDetails.email,
                    studentDetails.name,
                    application.application_id,
                    'submitted',
                    pdfBase64
                );
            } catch (notifyErr) {
                console.error("Successfully submitted application but failed to send email notification", notifyErr);
            }

            navigate(`/success/${application.application_id}`);
        } catch (err) {
            console.error('Error submitting application:', err);
            setError(err.message || 'Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // --- Renderers ---

    return (
        <div className="min-h-screen bg-purple-50 dark:bg-gray-900 py-6 sm:py-12 px-4 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">

                {/* Header Card */}
                <div className="bg-purple-600 dark:bg-purple-900 text-white rounded-t-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-colors duration-300">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Apply for Leave</h1>
                                <p className="text-purple-100 text-sm sm:text-base">Submit your absence application</p>
                            </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="hidden sm:flex items-center gap-3 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-white text-purple-600' : 'bg-white/20 text-white'}`}>1</div>
                            <div className={`w-8 h-1 ${step >= 2 ? 'bg-white' : 'bg-white/20'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-white text-purple-600' : 'bg-white/20 text-white'}`}>2</div>
                            <div className={`w-8 h-1 ${step >= 3 ? 'bg-white' : 'bg-white/20'}`}></div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-white text-purple-600' : 'bg-white/20 text-white'}`}>3</div>
                        </div>
                    </div>
                </div>

                {/* Alert Messages */}
                {error && (
                    <div className="mx-4 sm:mx-8 mt-6 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border-l-4 border-red-500 font-medium shadow-sm animate-shake">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mx-4 sm:mx-8 mt-6 flex items-start gap-3 p-4 bg-green-50 text-green-700 rounded-xl border-l-4 border-green-500 font-medium shadow-sm">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base">{success}</span>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-b-3xl shadow-xl transition-colors duration-300 relative min-h-[400px]">

                    {/* STEP 1: ENROLLMENT */}
                    {step === 1 && (
                        <div className="p-6 sm:p-12 max-w-2xl mx-auto text-center animate-fade-in">
                            <div className="w-20 h-20 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                                <User className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Identify Yourself</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                                Please enter your enrollment number to let us fetch your academic details. An OTP will be sent to your registered college email.
                            </p>

                            <form onSubmit={handleVerifyEnrollment}>
                                <div className="max-w-md mx-auto relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <FileText className="h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        value={enrollmentNumber}
                                        onChange={(e) => setEnrollmentNumber(e.target.value)}
                                        className="block w-full pl-12 pr-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 focus:border-purple-500 transition-all text-lg font-medium tracking-wider text-center"
                                        placeholder="e.g. 2203051240100"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading || !enrollmentNumber}
                                    className="mt-8 mx-auto flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none"
                                >
                                    {loading ? 'Verifying...' : 'Send OTP'}
                                    {!loading && <ChevronRight className="w-5 h-5" />}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* STEP 2: OTP VERIFICATION */}
                    {step === 2 && (
                        <div className="p-6 sm:p-12 max-w-2xl mx-auto text-center animate-fade-in">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                                <KeyRound className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Verify Your Email</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
                                We've sent a 6-digit code to <strong>{maskEmail(studentDetails?.email)}</strong>. Code expires in 5 minutes.
                            </p>

                            <form onSubmit={handleVerifyOTP}>
                                <div className="max-w-xs mx-auto">
                                    <input
                                        type="text"
                                        required
                                        autoFocus
                                        maxLength="6"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="block w-full px-4 py-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 focus:border-emerald-500 transition-all text-2xl font-bold tracking-[0.5em] text-center"
                                        placeholder="000000"
                                    />
                                </div>

                                <div className="mt-8 flex flex-col items-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={loading || otpCode.length !== 6}
                                        className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none"
                                    >
                                        {loading ? 'Verifying...' : 'Verify OTP'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleResendOTP}
                                        disabled={loading}
                                        className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 disabled:opacity-50"
                                    >
                                        Didn't receive code? Resend
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* STEP 3: LEAVE FORM (Read-Only Specs + Leave Details) */}
                    {step === 3 && studentDetails && (
                        <form onSubmit={handleSubmitApplication} className="animate-fade-in">

                            {/* Read-Only Academic Details */}
                            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                                        <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Your Profile</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Verified academic details</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-3 shadow-sm">
                                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Name</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{studentDetails.name}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-3 shadow-sm">
                                        <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Enrollment</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{studentDetails.enrollment_number}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-3 shadow-sm sm:col-span-2 lg:col-span-1">
                                        <School className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">College</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">{studentDetails.division.branch.department.college.name}</p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-3 shadow-sm">
                                        <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Department & Branch</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {studentDetails.division.branch.department.name} • {studentDetails.division.branch.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex gap-3 shadow-sm">
                                        <Users className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Division & Semester</p>
                                            <p className="font-medium text-gray-800 dark:text-gray-200">
                                                {studentDetails.division.code} (Sem {studentDetails.division.semester})
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Leave Details Form */}
                            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-xl flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Leave Details</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="leaveType" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                            <FileText className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                            Leave Type *
                                        </label>
                                        <select
                                            id="leaveType"
                                            name="leaveType"
                                            value={formData.leaveType}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base bg-white dark:bg-gray-900 transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 dark:focus:ring-fuchsia-900/30 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select Leave Type</option>
                                            <option value="Hackathon">Hackathon</option>
                                            <option value="NCC">NCC</option>
                                            <option value="Sports">Sports</option>
                                            <option value="Cultural Event">Cultural Event</option>
                                            <option value="Medical">Medical</option>
                                            <option value="Family Emergency">Family Emergency</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4 sm:space-y-0 sm:flex sm:gap-4 sm:col-span-2">
                                        <div className="space-y-2 flex-1">
                                            <label htmlFor="fromDate" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                                <Calendar className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                                From Date *
                                            </label>
                                            <input
                                                type="date"
                                                id="fromDate"
                                                name="fromDate"
                                                value={formData.fromDate}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 dark:focus:ring-fuchsia-900/30 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                            />
                                        </div>

                                        <div className="space-y-2 flex-1">
                                            <label htmlFor="toDate" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                                <Calendar className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                                To Date *
                                            </label>
                                            <input
                                                type="date"
                                                id="toDate"
                                                name="toDate"
                                                value={formData.toDate}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 dark:focus:ring-fuchsia-900/30 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    {/* Dynamic Category Details */}
                                    {formData.leaveType && !['Other', 'Family Emergency'].includes(formData.leaveType) && (
                                        <div className="sm:col-span-2 p-5 bg-fuchsia-50 dark:bg-fuchsia-900/10 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800 space-y-4">
                                            <h3 className="font-bold text-fuchsia-800 dark:text-fuchsia-300 text-sm uppercase tracking-wider">Additional {formData.leaveType} Details</h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {formData.leaveType === 'Hackathon' && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Event Name *</label>
                                                            <input type="text" name="eventName" value={categoryDetails.eventName || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Location *</label>
                                                            <input type="text" name="location" value={categoryDetails.location || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="space-y-1 sm:col-span-2">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Prize / Money Involved</label>
                                                            <input type="text" name="prizeDetails" value={categoryDetails.prizeDetails || ''} onChange={handleCategoryDetailChange} placeholder="e.g. ₹5000 1st Prize, or None" className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                    </>
                                                )}
                                                {formData.leaveType === 'NCC' && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Camp Name *</label>
                                                            <input type="text" name="campName" value={categoryDetails.campName || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Location *</label>
                                                            <input type="text" name="location" value={categoryDetails.location || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                    </>
                                                )}
                                                {formData.leaveType === 'Sports' && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Tournament Name *</label>
                                                            <input type="text" name="tournamentName" value={categoryDetails.tournamentName || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Sport Type *</label>
                                                            <input type="text" name="sportType" value={categoryDetails.sportType || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="space-y-1 sm:col-span-2">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Level (College, State, National) *</label>
                                                            <input type="text" name="level" value={categoryDetails.level || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                    </>
                                                )}
                                                {formData.leaveType === 'Cultural Event' && (
                                                    <>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Event/Fest Name *</label>
                                                            <input type="text" name="eventName" value={categoryDetails.eventName || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Activity Role *</label>
                                                            <input type="text" name="activityRole" value={categoryDetails.activityRole || ''} onChange={handleCategoryDetailChange} required placeholder="e.g. Dancer, Singer, Organizer" className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                        </div>
                                                    </>
                                                )}
                                                {formData.leaveType === 'Medical' && (
                                                    <div className="space-y-1 sm:col-span-2">
                                                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">Expected Recovery Date (For Fitness Certificate) *</label>
                                                        <input type="date" name="recoveryDate" value={categoryDetails.recoveryDate || ''} onChange={handleCategoryDetailChange} required className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-200 dark:focus:ring-fuchsia-900 text-gray-900 dark:text-white" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2 sm:col-span-2">
                                        <label htmlFor="reason" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                            <MessageSquare className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                                            Reason for Leave *
                                        </label>
                                        <textarea
                                            id="reason"
                                            name="reason"
                                            value={formData.reason}
                                            onChange={handleInputChange}
                                            placeholder="Provide detailed reason for your leave application"
                                            rows="4"
                                            required
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 dark:focus:ring-fuchsia-900/30 resize-none hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Upload Proof */}
                            <div className="p-6 sm:p-8 bg-gray-50 dark:bg-gray-800/50">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                        <Upload className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Upload Proofs (Optional)</h2>
                                </div>
                                <p className="text-gray-600 text-sm mb-6 ml-14 max-w-2xl">
                                    Attach supporting documents like medical certificates, event invitations, etc.
                                </p>

                                <div className="w-full max-w-2xl mx-auto grid gap-6">
                                    <FileUpload
                                        applicationId={null}
                                        onUploadSuccess={handleProofUpload}
                                        onUploadError={(msg) => setError(msg)}
                                    />

                                    {uploadedProofs.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                                <LinkIcon className="w-4 h-4" />
                                                Attached Files ({uploadedProofs.length})
                                            </h3>
                                            {uploadedProofs.map((proof, index) => (
                                                <div key={index} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:border-blue-300">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                            {proof.fileName.toLowerCase().endsWith('.pdf') ? (
                                                                <FileText className="w-5 h-5 text-blue-600" />
                                                            ) : (
                                                                <Eye className="w-5 h-5 text-blue-600" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-gray-800 truncate" title={proof.fileName}>{proof.fileName}</p>
                                                            <a
                                                                href={proof.publicUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                                            >
                                                                View File
                                                            </a>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveProof(index)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Remove file"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="p-6 sm:p-8">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-xl text-lg font-bold transition-all hover:bg-purple-700 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            <span>Submit Leave Application</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
};

export default StudentApplication;
