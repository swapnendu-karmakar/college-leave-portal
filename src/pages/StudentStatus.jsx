import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, AlertCircle, CheckCircle2, Download, Copy, Check } from 'lucide-react';
import { getApplicationById, createProof } from '../services/supabase';
import StatusBadge from '../components/shared/StatusBadge';
import FileUpload from '../components/shared/FileUpload';
import { formatDate, getProofStatusText } from '../utils/validators';
import jsPDF from 'jspdf';

const StudentStatus = () => {
    const [searchParams] = useSearchParams();
    const [applicationId, setApplicationId] = useState(searchParams.get('id') || '');
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [copied, setCopied] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!applicationId.trim()) {
            setError('Please enter an Application ID');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const data = await getApplicationById(applicationId.trim());
            setApplication(data);
        } catch (err) {
            console.error('Error fetching application:', err);
            setError('Application not found. Please check your Application ID.');
            setApplication(null);
        } finally {
            setLoading(false);
        }
    };

    const handleProofUpload = async (proofData) => {
        try {
            await createProof({
                application_id: application.id,
                file_url: proofData.publicUrl,
                file_name: proofData.fileName,
                status: 'pending',
            });

            setUploadSuccess('Proof uploaded successfully!');
            const updatedApp = await getApplicationById(applicationId);
            setApplication(updatedApp);
            setTimeout(() => setUploadSuccess(''), 3000);
        } catch (err) {
            console.error('Error creating proof record:', err);
            setError('Failed to save proof. Please try again.');
        }
    };

    const handleProofError = (errorMsg) => {
        setError(errorMsg);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(applicationId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDownload = () => {
        if (!application) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(139, 92, 246);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('Leave Application Details', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(application.application_id, 105, 30, { align: 'center' });

        // Content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text('Student Information', 20, 55);

        doc.setFontSize(10);
        let y = 65;
        doc.text(`Name: ${application.student_name}`, 20, y);
        y += 7;
        doc.text(`Enrollment: ${application.enrollment_number}`, 20, y);
        y += 7;
        doc.text(`Email: ${application.email}`, 20, y);
        y += 10;

        doc.setFontSize(14);
        doc.text('Academic Details', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`College: ${application.college?.name || 'N/A'}`, 20, y);
        y += 7;
        doc.text(`Department: ${application.department?.name || 'N/A'}`, 20, y);
        y += 7;
        doc.text(`Branch: ${application.branch?.name || 'N/A'}`, 20, y);
        y += 7;
        doc.text(`Division: ${application.division?.code || 'N/A'}`, 20, y);
        y += 10;

        doc.setFontSize(14);
        doc.text('Leave Details', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`Leave Type: ${application.leave_type}`, 20, y);
        y += 7;
        doc.text(`From: ${formatDate(application.from_date)}`, 20, y);
        y += 7;
        doc.text(`To: ${formatDate(application.to_date)}`, 20, y);
        y += 7;
        doc.text(`Reason: ${application.reason}`, 20, y, { maxWidth: 170 });
        y += 15;

        doc.setFontSize(14);
        doc.text('Status', 20, y);
        y += 10;

        doc.setFontSize(10);
        doc.text(`Application Status: ${application.status.toUpperCase()}`, 20, y);
        y += 7;
        doc.text(`Proof Status: ${getProofStatusText(application.proof_status)}`, 20, y);
        y += 7;
        doc.text(`Submitted: ${formatDate(application.created_at)}`, 20, y);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('College Leave Portal - Generated on ' + new Date().toLocaleString(), 105, 280, { align: 'center' });

        doc.save(`Application_${application.application_id}.pdf`);
    };

    return (
        <div className="min-h-screen bg-purple-50 py-6 sm:py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-purple-600 text-white rounded-t-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                    <div className="relative z-10 flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <Search className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold mb-1 sm:mb-2">Track Your Application</h1>
                            <p className="text-purple-100 text-sm sm:text-base">Enter your Application ID to check the status</p>
                        </div>
                    </div>
                </div>

                {/* Search Form */}
                <div className="bg-white p-6 sm:p-8 shadow-xl">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <input
                            type="text"
                            value={applicationId}
                            onChange={(e) => setApplicationId(e.target.value)}
                            placeholder="Enter Application ID (e.g., LA-XXX-XXXX)"
                            className="flex-1 px-4 py-3.5 border-2 border-gray-200 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 hover:border-gray-300"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 bg-purple-600 text-white rounded-xl font-semibold transition-all hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span className="hidden sm:inline">Searching...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5" />
                                    <span className="hidden sm:inline">Search</span>
                                    <span className="sm:hidden">Go</span>
                                </>
                            )}
                        </button>
                    </form>

                    {error && (
                        <div className="flex items-start gap-3 p-4 mt-6 bg-red-50 text-red-700 rounded-xl border-l-4 border-red-500 font-medium">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-sm sm:text-base">{error}</span>
                        </div>
                    )}

                    {uploadSuccess && (
                        <div className="flex items-start gap-3 p-4 mt-6 bg-green-50 text-green-700 rounded-xl border-l-4 border-green-500 font-medium">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-sm sm:text-base">{uploadSuccess}</span>
                        </div>
                    )}
                </div>

                {/* Application Details */}
                {application && (
                    <div className="bg-white rounded-b-3xl shadow-xl p-6 sm:p-8">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pb-6 border-b-2 border-purple-100">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-violet-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Application Details</h2>
                                    <p className="text-sm text-gray-600 font-mono">{application.application_id}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all text-sm"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    <span>{copied ? 'Copied!' : 'Copy ID'}</span>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-all text-sm"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download PDF</span>
                                </button>
                            </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-4 mb-8">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600">Application:</span>
                                <StatusBadge status={application.status} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600">Proof:</span>
                                <StatusBadge status={application.proof_status} text={getProofStatusText(application.proof_status)} />
                            </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8">
                            <DetailItem label="Student Name" value={application.student_name} />
                            <DetailItem label="Enrollment Number" value={application.enrollment_number} />
                            <DetailItem label="Email" value={application.email} />
                            <DetailItem label="College" value={application.college?.name} />
                            <DetailItem label="Department" value={application.department?.name} />
                            <DetailItem label="Branch" value={application.branch?.name} />
                            <DetailItem label="Division" value={application.division?.code} />
                            <DetailItem label="Leave Type" value={application.leave_type} />
                            <DetailItem label="Leave Period" value={`${formatDate(application.from_date)} - ${formatDate(application.to_date)}`} />
                            <DetailItem label="Submitted On" value={formatDate(application.created_at)} />
                            {application.reviewed_at && (
                                <DetailItem label="Reviewed On" value={formatDate(application.reviewed_at)} />
                            )}
                            <div className="sm:col-span-2">
                                <DetailItem label="Reason" value={application.reason} />
                            </div>
                        </div>

                        {/* Proofs Section */}
                        {application.proofs && application.proofs.length > 0 && (
                            <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-purple-100">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-600" />
                                    Uploaded Proofs
                                </h3>
                                <div className="space-y-3">
                                    {application.proofs.map((proof) => (
                                        <div key={proof.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                                            <div className="flex items-center gap-3 flex-1">
                                                <FileText className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-900 font-medium text-sm break-all">{proof.file_name}</span>
                                                <StatusBadge status={proof.status} />
                                            </div>
                                            <a
                                                href={proof.file_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full sm:w-auto px-4 py-2 bg-violet-600 text-white rounded-lg font-medium transition-all hover:bg-violet-700 text-center text-sm"
                                            >
                                                View Proof
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Upload Section */}
                        {application.proof_status === 'not_submitted' && (
                            <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    Upload Proof
                                </h3>
                                <p className="text-gray-600 text-sm mb-4">
                                    You can upload your proof document here. It will be reviewed by your MFT.
                                </p>
                                <FileUpload
                                    applicationId={application.application_id}
                                    onUploadSuccess={handleProofUpload}
                                    onUploadError={handleProofError}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailItem = ({ label, value }) => (
    <div className="space-y-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <p className="text-base text-gray-900 font-medium break-words">{value || 'N/A'}</p>
    </div>
);

export default StudentStatus;
