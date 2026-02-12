import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getMFTDivisions,
    getApplicationsByMFT,
    getStudentsByDivision,
    updateApplicationStatus,
    updateProofStatus,
    updateProofReviewStatus,
} from '../services/supabase';
import StatusBadge from '../components/shared/StatusBadge';
import { formatDate, getProofStatusText } from '../utils/validators';

const FacultyDashboard = () => {
    const navigate = useNavigate();
    const [mft, setMft] = useState(null);
    const [divisions, setDivisions] = useState([]);
    const [applications, setApplications] = useState([]);
    const [students, setStudents] = useState([]);
    const [activeTab, setActiveTab] = useState('applications');
    const [selectedDivision, setSelectedDivision] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                const allStudents = await Promise.all(
                    divisionsData.map(div => getStudentsByDivision(div.id))
                );
                setStudents(allStudents.flat());
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

    const handleApprove = async (application) => {
        try {
            await updateApplicationStatus(application.id, 'approved');

            if (application.proofs && application.proofs.length > 0) {
                await updateProofStatus(application.id, 'approved');
                for (const proof of application.proofs) {
                    await updateProofReviewStatus(proof.id, 'approved');
                }
            }

            const updatedApplications = await getApplicationsByMFT(mft.id);
            setApplications(updatedApplications);
            alert('Application approved successfully!');
        } catch (err) {
            console.error('Error approving application:', err);
            alert('Failed to approve application');
        }
    };

    const handleReject = async (application) => {
        if (!confirm('Are you sure you want to reject this application?')) {
            return;
        }

        try {
            await updateApplicationStatus(application.id, 'rejected');

            if (application.proofs && application.proofs.length > 0) {
                await updateProofStatus(application.id, 'rejected');
                for (const proof of application.proofs) {
                    await updateProofReviewStatus(proof.id, 'rejected');
                }
            }

            const updatedApplications = await getApplicationsByMFT(mft.id);
            setApplications(updatedApplications);
            alert('Application rejected successfully!');
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

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen text-2xl text-purple-600">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Faculty Dashboard</h1>
                        <p className="text-purple-100">Welcome, {mft?.name}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-6 py-2.5 bg-white/20 border-2 border-white rounded-lg font-semibold transition-all hover:bg-white hover:text-purple-600"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500">{error}</div>}

                <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
                    <button
                        className={`px-8 py-4 font-semibold text-lg transition-all border-b-3 ${activeTab === 'applications'
                                ? 'text-purple-600 border-purple-600'
                                : 'text-gray-600 border-transparent hover:text-purple-600'
                            }`}
                        onClick={() => setActiveTab('applications')}
                    >
                        Leave Applications ({applications.length})
                    </button>
                    <button
                        className={`px-8 py-4 font-semibold text-lg transition-all border-b-3 ${activeTab === 'students'
                                ? 'text-purple-600 border-purple-600'
                                : 'text-gray-600 border-transparent hover:text-purple-600'
                            }`}
                        onClick={() => setActiveTab('students')}
                    >
                        Student Roster ({students.length})
                    </button>
                </div>

                <div className="flex gap-8 mb-8 p-6 bg-white rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                        <label className="font-semibold text-gray-700">Division:</label>
                        <select
                            value={selectedDivision}
                            onChange={(e) => setSelectedDivision(e.target.value)}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg cursor-pointer transition-all focus:outline-none focus:border-purple-500"
                        >
                            <option value="all">All Divisions</option>
                            {divisions.map(div => (
                                <option key={div.id} value={div.id}>{div.code}</option>
                            ))}
                        </select>
                    </div>

                    {activeTab === 'applications' && (
                        <div className="flex items-center gap-3">
                            <label className="font-semibold text-gray-700">Status:</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-4 py-2 border-2 border-gray-200 rounded-lg cursor-pointer transition-all focus:outline-none focus:border-purple-500"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                    )}
                </div>

                {activeTab === 'applications' && (
                    <div className="space-y-6">
                        {filteredApplications.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 text-lg bg-white rounded-xl">No applications found</div>
                        ) : (
                            filteredApplications.map(app => (
                                <div key={app.id} className="bg-white rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md">
                                    <div className="flex justify-between items-start p-6 bg-gray-50 border-b border-gray-200">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-1">{app.student_name}</h3>
                                            <p className="text-gray-600 text-sm">{app.enrollment_number}</p>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            <StatusBadge status={app.status} />
                                            <StatusBadge status={app.proof_status} text={getProofStatusText(app.proof_status)} />
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                            <div>
                                                <span className="text-sm font-semibold text-gray-500">Division:</span>
                                                <span className="ml-2 text-gray-900">{app.division?.code}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-semibold text-gray-500">Leave Type:</span>
                                                <span className="ml-2 text-gray-900">{app.leave_type}</span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-semibold text-gray-500">Period:</span>
                                                <span className="ml-2 text-gray-900">{formatDate(app.from_date)} - {formatDate(app.to_date)}</span>
                                            </div>
                                            <div className="md:col-span-3">
                                                <span className="text-sm font-semibold text-gray-500">Reason:</span>
                                                <span className="ml-2 text-gray-900">{app.reason}</span>
                                            </div>
                                        </div>

                                        {app.proofs && app.proofs.length > 0 && (
                                            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                                                <strong className="text-gray-700">Proofs:</strong>
                                                {app.proofs.map(proof => (
                                                    <a
                                                        key={proof.id}
                                                        href={proof.file_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium transition-all hover:bg-purple-700"
                                                    >
                                                        View {proof.file_name}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {app.status === 'pending' && (
                                        <div className="flex gap-4 p-6 bg-gray-50 border-t border-gray-200">
                                            <button
                                                onClick={() => handleApprove(app)}
                                                className="flex-1 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold transition-all hover:bg-green-600 hover:-translate-y-0.5"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(app)}
                                                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold transition-all hover:bg-red-600 hover:-translate-y-0.5"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        {filteredStudents.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 text-lg">No students found</div>
                        ) : (
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Enrollment Number</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Name</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Email</th>
                                        <th className="px-6 py-4 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Division</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map(student => {
                                        const division = divisions.find(d => d.id === student.division_id);
                                        return (
                                            <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-900">{student.enrollment_number}</td>
                                                <td className="px-6 py-4 text-gray-900">{student.name}</td>
                                                <td className="px-6 py-4 text-gray-600">{student.email}</td>
                                                <td className="px-6 py-4 text-gray-900">{division?.code}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacultyDashboard;
