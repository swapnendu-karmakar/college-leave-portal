import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Lock,
    FileText,
    Users,
    CheckCircle2,
    XCircle,
    Clock,
    Filter,
    ChevronDown,
    Search,
    GraduationCap,
    School,
    MessageSquare
} from 'lucide-react';
import {
    getMFTDivisions,
    getApplicationsByMFT,
    getStudentsByDivision,
    getFacultyByDivision,
    updateApplicationStatus,
    updateProofStatus,
    updateProofReviewStatus,
    updateMFTPassword,
    updateApplicationFacultyRemark,
    getApplicationById,
} from '../services/supabase';
import { sendRejectionNotification, sendStudentNotification } from '../services/emailService';
import StatusBadge from '../components/shared/StatusBadge';
import { formatDate, getProofStatusText, hashPassword } from '../utils/validators';
import { generateApplicationPDF } from '../utils/pdfGenerator';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const FacultyDashboard = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [mft, setMft] = useState(null);
    const [divisions, setDivisions] = useState([]);
    const [applications, setApplications] = useState([]);
    const [students, setStudents] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [activeTab, setActiveTab] = useState('applications');
    const [selectedDivision, setSelectedDivision] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // Remark Modal State
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [selectedAppForRemark, setSelectedAppForRemark] = useState(null);
    const [remarkText, setRemarkText] = useState('');

    useEffect(() => {
        const mftData = sessionStorage.getItem('mft');
        if (!mftData) {
            navigate('/faculty/login');
            return;
        }

        const parsedMft = JSON.parse(mftData);
        setMft(parsedMft);
        loadData(parsedMft.id);
    }, [navigate]);

    const loadData = async (mftId) => {
        try {
            setLoading(true);
            const [divisionsData, applicationsData] = await Promise.all([
                getMFTDivisions(mftId),
                getApplicationsByMFT(mftId),
            ]);

            setDivisions(divisionsData);
            setApplications(applicationsData);

            if (divisionsData.length > 0) {
                const [allStudents, allFaculty] = await Promise.all([
                    Promise.all(divisionsData.map(div => getStudentsByDivision(div.id))),
                    Promise.all(divisionsData.map(div => getFacultyByDivision(div.id)))
                ]);
                setStudents(allStudents.flat());
                setFaculty(allFaculty.flat());
            }
        } catch (err) {
            console.error('Error loading data:', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('mft');
        navigate('/faculty/login');
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);
            const passwordHash = await hashPassword(newPassword);
            await updateMFTPassword(mft.id, passwordHash);

            setShowPasswordModal(false);
            setSuccess('Password updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (application) => {
        try {
            await updateApplicationStatus(application.id, 'approved');

            if (application.proofs && application.proofs.length > 0) {
                await updateProofStatus(application.id, 'approved');
                for (const proof of application.proofs) {
                    await updateProofReviewStatus(proof.id, 'approved');
                }
            }

            try {
                const fullApp = await getApplicationById(application.application_id);
                const pdfBase64 = generateApplicationPDF(fullApp, 'datauristring');
                await sendStudentNotification(
                    application.email,
                    application.student_name,
                    application.application_id,
                    'approved',
                    pdfBase64
                );
            } catch (err) {
                console.error('Failed to notify student:', err);
            }

            const updatedApplications = await getApplicationsByMFT(mft.id);
            setApplications(updatedApplications);
            alert('Application approved successfully!');
        } catch (err) {
            console.error('Error approving application:', err);
            alert('Failed to approve application');
        }
    };

    const handleAddRemarkSubmit = async (e) => {
        e.preventDefault();
        if (!remarkText.trim() || !selectedAppForRemark) return;

        try {
            setLoading(true);
            await updateApplicationFacultyRemark(selectedAppForRemark.id, remarkText.trim());
            
            const updatedApplications = await getApplicationsByMFT(mft.id);
            setApplications(updatedApplications);
            setSuccess('Remark added successfully!');
            setTimeout(() => setSuccess(''), 3000);
            setShowRemarkModal(false);
            setRemarkText('');
        } catch (err) {
            console.error('Error adding remark:', err);
            setError('Failed to add remark');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (application) => {
        if (!confirm('Are you sure you want to reject this application?')) {
            return;
        }

        try {
            // 1. Update application status in DB
            await updateApplicationStatus(application.id, 'rejected');

            if (application.proofs && application.proofs.length > 0) {
                await updateProofStatus(application.id, 'rejected');
                for (const proof of application.proofs) {
                    await updateProofReviewStatus(proof.id, 'rejected');
                }
            }

            // 2. Notify all faculty members of the division
            const divisionFaculty = await getFacultyByDivision(application.division_id);

            // We use Promise.allSettled to ensure that even if one email fails, others might succeed,
            // and the UI update still happens.
            const emailPromises = divisionFaculty.map(f =>
                sendRejectionNotification(
                    f.email,
                    application.student_name,
                    application.enrollment_number,
                    application.application_id,
                    application.division?.code || 'Unknown Division', // application object might need refresh or we use what we have
                    application.reason
                ).catch(e => console.error(`Failed to send email to ${f.email}:`, e))
            );

            await Promise.allSettled(emailPromises);
            console.log(`Rejection notifications sent to ${divisionFaculty.length} faculty members.`);

            // Notify Student
            try {
                const fullApp = await getApplicationById(application.application_id);
                const pdfBase64 = generateApplicationPDF(fullApp, 'datauristring');
                await sendStudentNotification(
                    application.email,
                    application.student_name,
                    application.application_id,
                    'rejected',
                    pdfBase64
                );
            } catch (err) {
                console.error('Failed to notify student:', err);
            }

            // 3. Refresh UI
            const updatedApplications = await getApplicationsByMFT(mft.id);
            setApplications(updatedApplications);
            alert(`Application rejected successfully! Notifications sent to ${divisionFaculty.length} faculty members.`);
        } catch (err) {
            console.error('Error rejecting application:', err);
            alert('Failed to reject application');
        }
    };

    const filteredApplications = applications.filter(app => {
        if (selectedDivision !== 'all' && app.division_id !== selectedDivision) return false;
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        return true;
    });

    const filteredStudents = selectedDivision === 'all'
        ? students
        : students.filter(s => s.division_id === selectedDivision);

    const filteredFaculty = selectedDivision === 'all'
        ? faculty
        : faculty.filter(f => f.division_id === selectedDivision);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <div className="bg-emerald-600 dark:bg-emerald-900 text-white shadow-xl sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
                                <LayoutDashboard className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold leading-tight">Faculty Dashboard</h1>
                                <p className="text-emerald-100 text-sm">Welcome, {mft?.name}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-105 active:scale-95"
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="h-8 w-px bg-white/20 hidden md:block"></div>
                            <button
                                onClick={() => setShowPasswordModal(true)}
                                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-105 active:scale-95"
                                title="Change Password"
                            >
                                <Lock className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all backdrop-blur-sm hover:scale-105 active:scale-95 text-sm sm:text-base"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
                {error && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border-l-4 border-red-500 font-medium animate-shake shadow-sm">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl border-l-4 border-green-500 font-medium shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {success}
                    </div>
                )}

                {/* Filters & Tabs Bar */}
                <div className="flex flex-col lg:flex-row gap-6 lg:items-center justify-between">
                    {/* Tabs */}
                    <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm inline-flex w-full lg:w-auto transition-colors duration-300">
                        <button
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'applications'
                                ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                }`}
                            onClick={() => setActiveTab('applications')}
                        >
                            <FileText className="w-4 h-4" />
                            Applications
                            <span className="ml-1.5 px-2 py-0.5 bg-white/20 rounded-lg text-xs">
                                {applications.length}
                            </span>
                        </button>
                        <button
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'students'
                                ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                }`}
                            onClick={() => setActiveTab('students')}
                        >
                            <Users className="w-4 h-4" />
                            Roster
                            <span className="ml-1.5 px-2 py-0.5 bg-white/20 rounded-lg text-xs">
                                {students.length}
                            </span>
                        </button>
                        <button
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'faculty'
                                ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                }`}
                            onClick={() => setActiveTab('faculty')}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Faculty
                            <span className="ml-1.5 px-2 py-0.5 bg-white/20 rounded-lg text-xs">
                                {faculty.length}
                            </span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                        <div className="relative group w-full sm:w-64">
                            <School className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                            <select
                                value={selectedDivision}
                                onChange={(e) => setSelectedDivision(e.target.value)}
                                className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium appearance-none cursor-pointer transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 hover:border-gray-200 dark:hover:border-gray-600"
                            >
                                <option value="all">All Divisions</option>
                                {divisions.map(div => (
                                    <option key={div.id} value={div.id} className="dark:bg-gray-800">{div.code}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>

                        {activeTab === 'applications' && (
                            <div className="relative group w-full sm:w-48">
                                <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full pl-10 pr-10 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 font-medium appearance-none cursor-pointer transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 hover:border-gray-200 dark:hover:border-gray-600"
                                >
                                    <option value="all">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                {activeTab === 'applications' && (
                    <div className="space-y-8 animate-fadeIn">
                        {selectedDivision === 'all' ? (
                            filteredApplications.length === 0 ? (
                                <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">No applications found</h3>
                                        <p className="text-gray-500 dark:text-gray-400">There are no leave applications to review at this moment.</p>
                                    </div>
                                </div>
                            ) : (
                                divisions.map(division => {
                                    const divisionApps = filteredApplications.filter(app => app.division_id === division.id);
                                    if (divisionApps.length === 0) return null;

                                    return (
                                        <div key={division.id} className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Division: {division.code}</h2>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium">
                                                    {divisionApps.length}
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                                <ApplicationTable
                                                    applications={divisionApps}
                                                    onApprove={handleApprove}
                                                    onReject={handleReject}
                                                    onRemark={(app) => {
                                                        setSelectedAppForRemark(app);
                                                        setRemarkText(app.faculty_remark || '');
                                                        setShowRemarkModal(true);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                {filteredApplications.length === 0 ? (
                                    <div className="p-12 text-center flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">No applications found</h3>
                                            <p className="text-gray-500 dark:text-gray-400">There are no leave applications matching your filters.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <ApplicationTable
                                        applications={filteredApplications}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onRemark={(app) => {
                                            setSelectedAppForRemark(app);
                                            setRemarkText(app.faculty_remark || '');
                                            setShowRemarkModal(true);
                                        }}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="space-y-8 animate-fadeIn">
                        {selectedDivision === 'all' ? (
                            filteredStudents.length === 0 ? (
                                <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">No students found</h3>
                                        <p className="text-gray-500 dark:text-gray-400">There are no students registered in your divisions yet.</p>
                                    </div>
                                </div>
                            ) : (
                                divisions.map(division => {
                                    const divisionStudents = filteredStudents.filter(s => s.division_id === division.id);
                                    if (divisionStudents.length === 0) return null;

                                    return (
                                        <div key={division.id} className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Division: {division.code}</h2>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium">
                                                    {divisionStudents.length} Students
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                                <StudentTable students={divisionStudents} />
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                {filteredStudents.length === 0 ? (
                                    <div className="p-12 text-center flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                                            <Users className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">No students found</h3>
                                            <p className="text-gray-500 dark:text-gray-400">There are no students in this division.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <StudentTable students={filteredStudents} />
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'faculty' && (
                    <div className="space-y-8 animate-fadeIn">
                        {selectedDivision === 'all' ? (
                            filteredFaculty.length === 0 ? (
                                <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-4">
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                                        <GraduationCap className="w-8 h-8" />
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">No faculty found</h3>
                                        <p className="text-gray-500 dark:text-gray-400">There are no faculty members assigned to your divisions yet.</p>
                                    </div>
                                </div>
                            ) : (
                                divisions.map(division => {
                                    const divisionFaculty = filteredFaculty.filter(f => f.division_id === division.id);
                                    if (divisionFaculty.length === 0) return null;

                                    return (
                                        <div key={division.id} className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="h-8 w-1 bg-emerald-500 rounded-full"></div>
                                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Division: {division.code}</h2>
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium">
                                                    {divisionFaculty.length} Faculty
                                                </span>
                                            </div>
                                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                                <FacultyTable faculty={divisionFaculty} />
                                            </div>
                                        </div>
                                    );
                                })
                            )
                        ) : (
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                                {filteredFaculty.length === 0 ? (
                                    <div className="p-12 text-center flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-2xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                                            <GraduationCap className="w-8 h-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">No faculty found</h3>
                                            <p className="text-gray-500 dark:text-gray-400">There are no faculty in this division.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <FacultyTable faculty={filteredFaculty} />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h3>
                            <button
                                onClick={() => setShowPasswordModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <LogOut className="w-5 h-5 text-gray-500 rotate-180" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1">New Password</label>
                                <input
                                    name="newPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
                                    placeholder="Min. 8 characters"
                                />
                            </div>
                            <div>
                                <label className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1">Confirm New Password</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30"
                                    placeholder="Re-enter new password"
                                />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/30 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2">
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Remark Modal */}
            {showRemarkModal && selectedAppForRemark && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-indigo-500" />
                                Add Remark
                            </h3>
                            <button
                                onClick={() => setShowRemarkModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <XCircle className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        
                        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                            Adding a remark for <strong>{selectedAppForRemark.student_name}</strong>'s application.
                            The student will see this remark when tracking their application and can reply.
                        </div>

                        {selectedAppForRemark.student_reply && (
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-xl">
                                <span className="block text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">Student's Reply:</span>
                                <p className="text-sm text-gray-800 dark:text-gray-200">{selectedAppForRemark.student_reply}</p>
                            </div>
                        )}

                        <form onSubmit={handleAddRemarkSubmit} className="space-y-4">
                            <div>
                                <textarea
                                    value={remarkText}
                                    onChange={(e) => setRemarkText(e.target.value)}
                                    placeholder="Enter your remark or requested changes..."
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white transition-all focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 min-h-[120px]"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowRemarkModal(false)}
                                    className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !remarkText.trim()}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? 'Saving...' : 'Save Remark'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const FacultyTable = ({ faculty }) => (
    <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-gray-50/80 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Faculty Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Email Contact</th>
                </tr>
            </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {faculty.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                {f.name.charAt(0)}
                            </div>
                            <span className="text-gray-900 dark:text-white font-medium">{f.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{f.email}</td>
                </tr>
            ))}
        </tbody>
        </table>
    </div>
);

// Extracted Components for cleaner code
const ApplicationTable = ({ applications, onApprove, onReject, onRemark }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/80 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Student</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Leave Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Reason</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Attachments</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center whitespace-nowrap">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {applications.map(app => (
                    <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                        <td className="px-6 py-4 align-top">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white">{app.student_name}</span>
                                <span className="text-xs text-yaml text-gray-500 dark:text-gray-400 mt-0.5">{app.enrollment_number}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900 dark:text-white">{app.leave_type}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                                    {formatDate(app.from_date)} - {formatDate(app.to_date)}
                                </span>
                                {app.category_details && Object.keys(app.category_details).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                        <div className="flex flex-col gap-1">
                                            {Object.entries(app.category_details).map(([key, value]) => (
                                                <div key={key} className="text-xs">
                                                    <span className="font-semibold text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                                    <span className="text-gray-800 dark:text-gray-300">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            {app.faculty_remark && (
                                <div className="mb-2 p-2 bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-indigo-500 rounded text-xs">
                                    <strong className="block text-indigo-700 dark:text-indigo-400 mb-0.5">Your Remark:</strong>
                                    <span className="text-gray-700 dark:text-gray-300">{app.faculty_remark}</span>
                                </div>
                            )}
                            {app.student_reply && (
                                <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500 rounded text-xs">
                                    <strong className="block text-blue-700 dark:text-blue-400 mb-0.5">Student's Reply:</strong>
                                    <span className="text-gray-700 dark:text-gray-300">{app.student_reply}</span>
                                </div>
                            )}
                            <p className="text-sm text-gray-700 dark:text-gray-300 min-w-[200px] max-w-sm mb-2" title={app.reason}>
                                {app.reason}
                            </p>
                            {app.category_results && Object.keys(app.category_results).length > 0 && (
                                <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded">
                                    <strong className="block text-xs text-emerald-700 dark:text-emerald-400 mb-1 uppercase tracking-wider">Submitted Results:</strong>
                                    <div className="flex flex-col gap-0.5">
                                        {Object.entries(app.category_results).map(([key, value]) => (
                                            <div key={key} className="text-xs">
                                                <span className="font-medium text-gray-600 dark:text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                                <span className="text-gray-800 dark:text-gray-200">{value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4 align-top">
                            {app.proofs && app.proofs.length > 0 ? (
                                <div className="flex flex-col gap-1.5 min-w-[120px]">
                                    {app.proofs.map(proof => (
                                        <a
                                            key={proof.id}
                                            href={proof.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded text-xs font-medium transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                                            title={proof.file_name}
                                        >
                                            <FileText className="w-3 h-3 flex-shrink-0" />
                                            <span className="truncate max-w-[150px]">{proof.file_name}</span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400 italic">None</span>
                            )}
                        </td>
                        <td className="px-6 py-4 align-top">
                            <div className="flex flex-col gap-2 min-w-[100px]">
                                <StatusBadge status={app.status} />
                                {app.proofs && app.proofs.length > 0 && (
                                    <StatusBadge status={app.proof_status} text={getProofStatusText(app.proof_status)} />
                                )}
                            </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                            {app.status === 'pending' ? (
                                <div className="flex flex-col gap-2 items-center min-w-[100px]">
                                    <button
                                        onClick={() => onApprove(app)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-semibold transition-colors border border-green-500/20"
                                        title="Approve"
                                    >
                                        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                        <span>Approve</span>
                                    </button>
                                    <button
                                        onClick={() => onReject(app)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 rounded-lg text-sm font-semibold transition-colors border border-red-500/20"
                                        title="Reject"
                                    >
                                        <XCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>Reject</span>
                                    </button>
                                    <button
                                        onClick={() => onRemark(app)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-semibold transition-colors border border-indigo-500/20"
                                        title="Add Remark"
                                    >
                                        <MessageSquare className="w-4 h-4 flex-shrink-0" />
                                        <span>Add Remark</span>
                                    </button>
                                </div>
                            ) : (
                                <span className="text-sm text-gray-400 flex justify-center mt-2">--</span>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const StudentTable = ({ students }) => (
    <div className="overflow-x-auto">
        <table className="w-full">
            <thead className="bg-gray-50/80 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Enrollment</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Student Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Email Contact</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {students.map(student => (
                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium font-mono text-sm">{student.enrollment_number}</td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                                    {student.name.charAt(0)}
                                </div>
                                <span className="text-gray-900 dark:text-white font-medium whitespace-nowrap">{student.name}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">{student.email}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


export default FacultyDashboard;
