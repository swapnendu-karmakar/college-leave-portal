import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, User, Mail, Calendar, MessageSquare, Upload, Send, AlertCircle, CheckCircle2, Trash2, Link as LinkIcon, Eye } from 'lucide-react';
import CascadingDropdowns from '../components/shared/CascadingDropdowns';
import FileUpload from '../components/shared/FileUpload';
import {
    verifyStudentEnrollment,
    createLeaveApplication,
    createProof,
    deleteStorageFile,
} from '../services/supabase';
import { validateCollegeEmail, validateDateRange } from '../utils/validators';

const StudentApplication = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        enrollmentNumber: '',
        studentName: '',
        email: '',
        reason: '',
        leaveType: '',
        fromDate: '',
        toDate: '',
    });

    const [selection, setSelection] = useState({
        collegeId: '',
        departmentId: '',
        branchId: '',
        divisionId: '',
        mftId: '',
    });

    // Changed to an array to hold multiple proofs
    const [uploadedProofs, setUploadedProofs] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSelectionChange = (newSelection) => {
        setSelection(newSelection);
        setError('');
    };

    const handleProofUpload = (proofData) => {
        // proofData: { filePath, publicUrl, fileName }
        setUploadedProofs(prev => [...prev, proofData]);
        setSuccess('Proof attached successfully! You can attach more files if needed.');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleRemoveProof = async (index) => {
        const proofToRemove = uploadedProofs[index];
        try {
            // Remove from storage to keep bucket clean
            await deleteStorageFile(proofToRemove.filePath);

            // Update state
            setUploadedProofs(prev => prev.filter((_, i) => i !== index));
            setSuccess('Proof removed successfully.');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error removing file:', err);
            setError('Failed to remove file from storage, but removed from list.');
            // Still remove from list even if storage delete fails
            setUploadedProofs(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleProofError = (errorMsg) => {
        setError(errorMsg);
    };

    const validateForm = () => {
        if (!formData.enrollmentNumber || !formData.studentName || !formData.email) {
            setError('Please fill in all required fields');
            return false;
        }

        if (!validateCollegeEmail(formData.email)) {
            setError('Please use your college email (@paruluniversity.ac.in)');
            return false;
        }

        if (!selection.divisionId) {
            setError('Please select College, Department, Branch, and Division');
            return false;
        }

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setSubmitting(true);
            setError('');

            const student = await verifyStudentEnrollment(
                formData.enrollmentNumber,
                selection.divisionId,
                formData.studentName,
                formData.email
            );

            if (!student) {
                setError('You are not a student of this division or MFT. Please check your enrollment number and division selection.');
                setSubmitting(false);
                return;
            }

            const application = await createLeaveApplication({
                enrollment_number: formData.enrollmentNumber,
                student_name: formData.studentName,
                email: formData.email,
                college_id: selection.collegeId,
                department_id: selection.departmentId,
                branch_id: selection.branchId,
                division_id: selection.divisionId,
                mft_id: selection.mftId,
                reason: formData.reason,
                leave_type: formData.leaveType,
                from_date: formData.fromDate,
                to_date: formData.toDate,
                status: 'pending',
                proof_status: uploadedProofs.length > 0 ? 'submitted' : 'not_submitted',
            });

            // Create records for all uploaded proofs
            if (uploadedProofs.length > 0) {
                // Use Promise.all to upload all proofs in parallel
                await Promise.all(uploadedProofs.map(proof =>
                    createProof({
                        application_id: application.id,
                        file_url: proof.publicUrl,
                        file_name: proof.fileName,
                        status: 'pending',
                    })
                ));
            }

            navigate(`/success/${application.application_id}`);
        } catch (err) {
            console.error('Error submitting application:', err);
            setError(err.message || 'Failed to submit application. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-purple-50 dark:bg-gray-900 py-6 sm:py-12 px-4 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-purple-600 dark:bg-purple-900 text-white rounded-t-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-colors duration-300">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Apply for Leave</h1>
                            <p className="text-purple-100 text-sm sm:text-base">Fill in the details below to submit your leave application</p>
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

                {/* Form Card */}
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-b-3xl shadow-xl transition-colors duration-300">
                    {/* Personal Information */}
                    <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Personal Information</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                                <label htmlFor="enrollmentNumber" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                    <FileText className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    Enrollment Number *
                                </label>
                                <input
                                    type="text"
                                    id="enrollmentNumber"
                                    name="enrollmentNumber"
                                    value={formData.enrollmentNumber}
                                    onChange={handleInputChange}
                                    placeholder="e.g., 2203051240100"
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="studentName" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                    <User className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    id="studentName"
                                    name="studentName"
                                    value={formData.studentName}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <label htmlFor="email" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                    <Mail className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                    College Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="yourname@paruluniversity.ac.in"
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Details */}
                    <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Academic Details</h2>
                        </div>
                        <CascadingDropdowns
                            onSelectionChange={handleSelectionChange}
                            selectedValues={selection}
                        />
                    </div>

                    {/* Leave Details */}
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

                            <div className="space-y-2">
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

                            <div className="space-y-2">
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
                            You can upload multiple files (images or PDFs). Each file will be previewed below.
                        </p>

                        <div className="w-full max-w-2xl mx-auto grid gap-6">
                            {/* File Upload Component */}
                            <FileUpload
                                applicationId={null} // Will use temp prefix
                                onUploadSuccess={handleProofUpload}
                                onUploadError={handleProofError}
                            />

                            {/* Uploaded Files List */}
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
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-purple-600 text-white rounded-xl text-lg font-bold transition-all hover:bg-purple-700 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    <span>Submit Application</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentApplication;
