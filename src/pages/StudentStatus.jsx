import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileText, AlertCircle, CheckCircle2, Download, Copy, Check, MessageSquare, Send, Award, Activity } from 'lucide-react';
import { getApplicationById, createProof, updateApplicationStudentReply, updateApplicationCategoryResults } from '../services/supabase';
import StatusBadge from '../components/shared/StatusBadge';
import FileUpload from '../components/shared/FileUpload';
import { formatDate, getProofStatusText } from '../utils/validators';
import { generateApplicationPDF } from '../utils/pdfGenerator';

const StudentStatus = () => {
    const [searchParams] = useSearchParams();
    const [applicationId, setApplicationId] = useState(searchParams.get('id') || '');
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    
    const [replyText, setReplyText] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    const [resultData, setResultData] = useState({});
    const [submittingResult, setSubmittingResult] = useState(false);

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
            setApplicationId(applicationId.trim());
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

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        try {
            setSubmittingReply(true);
            await updateApplicationStudentReply(application.application_id, replyText.trim());
            setUploadSuccess('Reply sent successfully!');
            
            const updatedApp = await getApplicationById(applicationId);
            setApplication(updatedApp);
            setReplyText('');
            
            setTimeout(() => setUploadSuccess(''), 3000);
        } catch (err) {
            console.error('Error submitting reply:', err);
            setError('Failed to send reply. Please try again.');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleResultChange = (e) => {
        const { name, value } = e.target;
        setResultData(prev => ({ ...prev, [name]: value }));
    };

    const handleResultSubmit = async (e) => {
        e.preventDefault();
        try {
            setSubmittingResult(true);
            await updateApplicationCategoryResults(application.application_id, resultData);
            
            setUploadSuccess('Results submitted successfully!');
            const updatedApp = await getApplicationById(applicationId);
            setApplication(updatedApp);
            setResultData({});
            
            setTimeout(() => setUploadSuccess(''), 3000);
        } catch (err) {
            console.error('Error submitting results:', err);
            setError('Failed to submit results. Please try again.');
        } finally {
            setSubmittingResult(false);
        }
    };

    const handleDownload = () => {
        if (!application) return;
        generateApplicationPDF(application, 'save');
    };

    return (
        <div className="min-h-screen bg-purple-50 dark:bg-gray-900 py-6 sm:py-12 px-4 transition-colors duration-300">
            <div className="max-w-4xl mx-auto">
                {/* Header Card */}
                <div className="bg-purple-600 dark:bg-purple-900 text-white rounded-t-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-colors duration-300">
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
                <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 shadow-xl transition-colors duration-300">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <input
                            type="text"
                            value={applicationId}
                            onChange={(e) => setApplicationId(e.target.value)}
                            placeholder="Enter Application ID (e.g., LA-XXX-XXXX)"
                            className="flex-1 px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-900/30 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
                    <div className="bg-white dark:bg-gray-800 rounded-b-3xl shadow-xl p-6 sm:p-8 transition-colors duration-300">
                        {/* Header with Actions */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 pb-6 border-b-2 border-purple-100 dark:border-purple-900/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Application Details</h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">{application.application_id}</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium transition-all text-sm"
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
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Application:</span>
                                <StatusBadge status={application.status} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Proof:</span>
                                <StatusBadge status={application.proof_status} text={getProofStatusText(application.proof_status)} />
                            </div>
                        </div>

                        {/* Remarks & Reply Section */}
                        {application.faculty_remark && (
                            <div className="mb-8 overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                                <div className="bg-indigo-50 dark:bg-indigo-900/30 p-5 sm:p-6">
                                    <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-2 mb-3">
                                        <MessageSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                        Remark from Faculty
                                    </h3>
                                    <p className="text-indigo-800 dark:text-indigo-200 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800 text-sm sm:text-base leading-relaxed">
                                        {application.faculty_remark}
                                    </p>
                                </div>
                                
                                <div className="bg-white dark:bg-gray-800 p-5 sm:p-6 border-t border-indigo-100 dark:border-indigo-900/50">
                                    {application.student_reply ? (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Your Reply</h4>
                                            <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-sm sm:text-base border border-gray-100 dark:border-gray-700">
                                                {application.student_reply}
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleReplySubmit} className="space-y-4">
                                            <div>
                                                <label htmlFor="replyText" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                    Reply to Faculty
                                                </label>
                                                <textarea
                                                    id="replyText"
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Type your response here..."
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 min-h-[100px]"
                                                    required
                                                />
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    type="submit"
                                                    disabled={submittingReply || !replyText.trim()}
                                                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {submittingReply ? (
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    ) : (
                                                        <Send className="w-4 h-4" />
                                                    )}
                                                    Send Reply
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        )}

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
                            
                            {/* Render Category Details */}
                            {application.category_details && Object.keys(application.category_details).length > 0 && (
                                <div className="sm:col-span-2 mt-4 p-5 bg-fuchsia-50 dark:bg-fuchsia-900/10 border border-fuchsia-100 dark:border-fuchsia-800 rounded-xl">
                                    <h4 className="text-sm font-bold text-fuchsia-800 dark:text-fuchsia-300 uppercase tracking-wider mb-3">
                                        {application.leave_type} Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {Object.entries(application.category_details).map(([key, value]) => (
                                            <DetailItem key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={value} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Render Category Results if present */}
                            {application.category_results && Object.keys(application.category_results).length > 0 && (
                                <div className="sm:col-span-2 mt-2 p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-xl">
                                    <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                                        <Award className="w-4 h-4" />
                                        Submitted Results
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {Object.entries(application.category_results).map(([key, value]) => (
                                            <DetailItem key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={value} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Proofs Section */}
                        {application.proofs && application.proofs.length > 0 && (
                            <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-purple-100 dark:border-purple-900/30">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    Uploaded Proofs
                                </h3>
                                <div className="space-y-3">
                                    {application.proofs.map((proof) => (
                                        <div key={proof.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                                            <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                                <FileText className="w-5 h-5 text-gray-400" />
                                                <span className="text-gray-900 dark:text-gray-200 font-medium text-sm break-all">{proof.file_name}</span>
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
                        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800/50">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Upload Proof / Extra Documents
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                                You can upload additional proofs, medical certificates, or relevant documents here, even if you already submitted them during the application.
                            </p>
                            <FileUpload
                                applicationId={application.application_id}
                                onUploadSuccess={handleProofUpload}
                                onUploadError={handleProofError}
                            />
                        </div>

                        {/* Event Results Form */}
                        {application.leave_type && !['Other', 'Family Emergency'].includes(application.leave_type) && 
                         (!application.category_results || Object.keys(application.category_results).length === 0) && (
                            <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/50">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    Post-Event Results / Updates
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                                    Please submit the outcome or results of your {application.leave_type} here. You can also upload certificates using the Proof Upload section above.
                                </p>
                                
                                <form onSubmit={handleResultSubmit} className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {application.leave_type === 'Hackathon' && (
                                            <>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Final Result</label>
                                                    <input type="text" name="finalResult" value={resultData.finalResult || ''} onChange={handleResultChange} required placeholder="e.g. Winner, Participant" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Prize Won</label>
                                                    <input type="text" name="prizeWon" value={resultData.prizeWon || ''} onChange={handleResultChange} placeholder="e.g. ₹5000, None" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Project Link (Optional)</label>
                                                    <input type="url" name="projectLink" value={resultData.projectLink || ''} onChange={handleResultChange} placeholder="https://github.com/..." className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                                </div>
                                            </>
                                        )}
                                        {application.leave_type === 'Sports' && (
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Result / Medal Won</label>
                                                <input type="text" name="medalWon" value={resultData.medalWon || ''} onChange={handleResultChange} required placeholder="e.g. Gold Medal, Participant" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                            </div>
                                        )}
                                        {application.leave_type === 'Cultural Event' && (
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Result / Awards Won</label>
                                                <input type="text" name="awardsWon" value={resultData.awardsWon || ''} onChange={handleResultChange} required placeholder="e.g. 1st Place in Dance" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                            </div>
                                        )}
                                        {application.leave_type === 'NCC' && (
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Certificate Achieved</label>
                                                <input type="text" name="certificateAchieved" value={resultData.certificateAchieved || ''} onChange={handleResultChange} required placeholder="e.g. C Certificate" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                            </div>
                                        )}
                                        {application.leave_type === 'Medical' && (
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Current Status</label>
                                                <input type="text" name="healthStatus" value={resultData.healthStatus || ''} onChange={handleResultChange} required placeholder="e.g. Fully Recovered" className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-emerald-100 dark:border-emerald-800 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 text-sm" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button
                                            type="submit"
                                            disabled={submittingResult || Object.keys(resultData).length === 0}
                                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {submittingResult ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            Submit Result
                                        </button>
                                    </div>
                                </form>
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
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        <p className="text-base text-gray-900 dark:text-gray-200 font-medium break-words">{value || 'N/A'}</p>
    </div>
);

export default StudentStatus;
