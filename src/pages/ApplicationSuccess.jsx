import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, Check, Download, FileText, Home, Search } from 'lucide-react';
import jsPDF from 'jspdf';

const ApplicationSuccess = () => {
    const { applicationId } = useParams();
    const [copied, setCopied] = useState(false);

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
        const doc = new jsPDF();

        // Add header
        doc.setFillColor(139, 92, 246);
        doc.rect(0, 0, 210, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.text('Leave Application', 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Submission Confirmation', 105, 30, { align: 'center' });

        // Add content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.text('Application Details', 20, 60);

        doc.setFontSize(10);
        doc.text(`Application ID: ${applicationId}`, 20, 75);
        doc.text(`Submission Date: ${new Date().toLocaleDateString()}`, 20, 85);
        doc.text(`Status: Pending Review`, 20, 95);

        // Add instructions
        doc.setFontSize(12);
        doc.text('Next Steps:', 20, 115);
        doc.setFontSize(10);
        doc.text('1. Save this Application ID for future reference', 25, 125);
        doc.text('2. Your MFT will review your application', 25, 135);
        doc.text('3. Check application status using the Application ID', 25, 145);
        doc.text('4. Upload proof if you haven\'t already', 25, 155);

        // Add footer
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text('College Leave Portal - Generated on ' + new Date().toLocaleString(), 105, 280, { align: 'center' });

        doc.save(`Leave_Application_${applicationId}.pdf`);
    };

    return (
        <div className="min-h-screen bg-purple-50 dark:bg-gray-900 flex items-center justify-center py-8 px-4 sm:py-12 transition-colors duration-300">
            <div className="max-w-2xl w-full">
                {/* Success Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transform hover:scale-[1.01] transition-all duration-300">
                    {/* Header with animated checkmark */}
                    <div className="bg-purple-600 dark:bg-purple-900 p-8 sm:p-12 text-center relative overflow-hidden transition-colors duration-300">
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                        <div className="relative z-10">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 animate-bounce shadow-lg">
                                <Check className="w-12 h-12 sm:w-16 sm:h-16 text-green-500" strokeWidth={3} />
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2 sm:mb-3">Application Submitted!</h1>
                            <p className="text-purple-100 text-base sm:text-lg">Your leave application has been successfully submitted</p>
                        </div>
                    </div>

                    {/* Application ID Section */}
                    <div className="p-6 sm:p-8">
                        <div className="bg-purple-600 dark:bg-purple-900/80 rounded-2xl p-6 sm:p-8 mb-6 sm:mb-8 shadow-lg transition-colors duration-300">
                            <div className="flex items-center justify-center gap-2 mb-3">
                                <FileText className="w-5 h-5 text-white" />
                                <p className="text-white/90 text-xs sm:text-sm font-medium text-center">Your Application ID</p>
                            </div>
                            <p className="text-white text-2xl sm:text-4xl font-bold text-center tracking-wider font-mono mb-4 sm:mb-6 break-all">
                                {applicationId}
                            </p>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 border border-white/30"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="text-sm sm:text-base">Copied!</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="text-sm sm:text-base">Copy ID</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-3.5 bg-white hover:bg-gray-50 text-purple-600 dark:text-purple-700 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 shadow-lg"
                                >
                                    <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                    <span className="text-sm sm:text-base">Download PDF</span>
                                </button>
                            </div>
                        </div>

                        {/* Information Card */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 p-4 sm:p-6 rounded-xl mb-6 sm:mb-8 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-3 text-sm sm:text-base">Important Information</h3>
                                    <ul className="space-y-2 sm:space-y-3 text-blue-800 dark:text-blue-300 text-xs sm:text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0">•</span>
                                            <span>Save your Application ID to track your application status</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0">•</span>
                                            <span>Your MFT will review your application</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0">•</span>
                                            <span>You can upload proof later if you haven't already</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0">•</span>
                                            <span>Check your application status using the link below</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <Link
                                to="/status"
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 text-white rounded-xl font-semibold text-center transition-all hover:bg-purple-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Search className="w-5 h-5" />
                                <span>Check Status</span>
                            </Link>
                            <Link
                                to="/"
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-center transition-all hover:bg-gray-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Home className="w-5 h-5" />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Additional Tips */}
                <div className="mt-6 text-center">
                    <p className="text-gray-600 text-xs sm:text-sm">
                        💡 Tip: Take a screenshot or download the PDF for your records
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ApplicationSuccess;
