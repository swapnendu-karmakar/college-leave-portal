import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, User, Mail, Calendar, MessageSquare, Upload, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import CascadingDropdowns from '../components/shared/CascadingDropdowns';
import FileUpload from '../components/shared/FileUpload';
import {
    verifyStudentEnrollment,
    createLeaveApplication,
    createProof,
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

    const [uploadedProof, setUploadedProof] = useState(null);
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
        setUploadedProof(proofData);
        setSuccess('Proof uploaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
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
                selection.divisionId
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
                proof_status: uploadedProof ? 'submitted' : 'not_submitted',
            });

            if (uploadedProof) {
                await createProof({
                    application_id: application.id,
                    file_url: uploadedProof.publicUrl,
                    file_name: uploadedProof.fileName,
                    status: 'pending',
                });
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
        <div className="min-h-screen bg-purple-50 py-6 sm:py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-purple-600 text-white rounded-t-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
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
                <form onSubmit={handleSubmit} className="bg-white rounded-b-3xl shadow-xl">
                    {/* Personal Information */}
                    <div className="p-6 sm:p-8 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                                <User className="w-5 h-5 text-violet-600" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Personal Information</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                                <label htmlFor="enrollmentNumber" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <FileText className="w-4 h-4 text-violet-600" />
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
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 hover:border-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="studentName" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <User className="w-4 h-4 text-violet-600" />
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
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 hover:border-gray-300"
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <label htmlFor="email" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <Mail className="w-4 h-4 text-violet-600" />
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
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 hover:border-gray-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Academic Details */}
                    <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Academic Details</h2>
                        </div>
                        <CascadingDropdowns
                            onSelectionChange={handleSelectionChange}
                            selectedValues={selection}
                        />
                    </div>

                    {/* Leave Details */}
                    <div className="p-6 sm:p-8 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-fuchsia-100 rounded-xl flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-fuchsia-600" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Leave Details</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                            <div className="space-y-2">
                                <label htmlFor="leaveType" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <FileText className="w-4 h-4 text-fuchsia-600" />
                                    Leave Type *
                                </label>
                                <select
                                    id="leaveType"
                                    name="leaveType"
                                    value={formData.leaveType}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base bg-white transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 cursor-pointer hover:border-gray-300"
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
                                <label htmlFor="fromDate" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <Calendar className="w-4 h-4 text-fuchsia-600" />
                                    From Date *
                                </label>
                                <input
                                    type="date"
                                    id="fromDate"
                                    name="fromDate"
                                    value={formData.fromDate}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 hover:border-gray-300"
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="toDate" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <Calendar className="w-4 h-4 text-fuchsia-600" />
                                    To Date *
                                </label>
                                <input
                                    type="date"
                                    id="toDate"
                                    name="toDate"
                                    value={formData.toDate}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 hover:border-gray-300"
                                />
                            </div>

                            <div className="space-y-2 sm:col-span-2">
                                <label htmlFor="reason" className="flex items-center gap-2 font-semibold text-gray-700 text-sm">
                                    <MessageSquare className="w-4 h-4 text-fuchsia-600" />
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
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-fuchsia-500 focus:ring-4 focus:ring-fuchsia-100 resize-none hover:border-gray-300"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Upload Proof */}
                    <div className="p-6 sm:p-8 bg-gray-50">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                <Upload className="w-5 h-5 text-blue-600" />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Upload Proof (Optional)</h2>
                        </div>
                        <p className="text-gray-600 text-sm mb-6 ml-14">
                            You can upload proof now or later. Some events provide certificates after completion.
                        </p>
                        <FileUpload
                            applicationId={null}
                            onUploadSuccess={handleProofUpload}
                            onUploadError={handleProofError}
                        />
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
