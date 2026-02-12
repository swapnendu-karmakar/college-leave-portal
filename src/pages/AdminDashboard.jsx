import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getColleges,
    createCollege,
    getDepartmentsByCollege,
    createDepartment,
    getBranchesByDepartment,
    createBranch,
    getDivisionsByBranch,
    createDivision,
    getAllMFTs,
    createMFT,
    createStudent,
    getStudentsByDivision,
    createFaculty,
    getFacultyByDivision,
    updateDivision,
    updateAdminPassword,
} from '../services/supabase';
import { hashPassword, generatePassword } from '../utils/validators';
import { sendMFTCredentials } from '../services/emailService';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    LogOut,
    Lock,
    X,
    Sun,
    Moon,
    Building2,
    Users,
    GraduationCap,
    ShieldCheck,
    Plus,
    Search,
    ChevronRight,
    School,
    BookOpen,
    GitBranch,
    Layers,
    CheckCircle2,
    Copy,
    Check
} from 'lucide-react';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [admin, setAdmin] = useState(null);
    const [activeTab, setActiveTab] = useState('hierarchy');
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [mfts, setMfts] = useState([]);
    const [students, setStudents] = useState([]);
    const [faculty, setFaculty] = useState([]);
    const [selectedCollege, setSelectedCollege] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [createdCredentials, setCreatedCredentials] = useState(null);
    const [stagedAssignments, setStagedAssignments] = useState({});
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    useEffect(() => {
        const adminData = sessionStorage.getItem('admin');
        if (!adminData) {
            navigate('/admin/login');
            return;
        }
        setAdmin(JSON.parse(adminData));
        loadInitialData();
    }, [navigate]);

    const loadInitialData = async () => {
        try {
            const [collegesData, mftsData] = await Promise.all([
                getColleges(),
                getAllMFTs(),
            ]);
            setColleges(collegesData);
            setMfts(mftsData);
        } catch (err) {
            console.error('Error loading data:', err);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin');
        navigate('/admin/login');
    };

    const handleCollegeChange = async (collegeId) => {
        setSelectedCollege(collegeId);
        setSelectedDepartment('');
        setSelectedBranch('');
        setSelectedDivision('');
        setDepartments([]);
        setBranches([]);
        setDivisions([]);
        if (collegeId) {
            const depts = await getDepartmentsByCollege(collegeId);
            setDepartments(depts);
        }
    };

    const handleDepartmentChange = async (deptId) => {
        setSelectedDepartment(deptId);
        setSelectedBranch('');
        setSelectedDivision('');
        setBranches([]);
        setDivisions([]);
        if (deptId) {
            const branchesData = await getBranchesByDepartment(deptId);
            setBranches(branchesData);
        }
    };

    const handleBranchChange = async (branchId) => {
        setSelectedBranch(branchId);
        setSelectedDivision('');
        setDivisions([]);
        if (branchId) {
            const divsData = await getDivisionsByBranch(branchId);
            setDivisions(divsData);
        }
    };

    const handleDivisionChange = async (divId) => {
        setSelectedDivision(divId);
        if (divId) {
            const studentsData = await getStudentsByDivision(divId);
            setStudents(studentsData);
            const facultyData = await getFacultyByDivision(divId);
            setFaculty(facultyData);
        }
    };

    const handleCreateCollege = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setLoading(true);
            await createCollege({
                name: formData.get('collegeName'),
                code: formData.get('collegeCode'),
            });
            const updatedColleges = await getColleges();
            setColleges(updatedColleges);
            setSuccess('College created successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to create college');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDepartment = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setLoading(true);
            await createDepartment({
                college_id: selectedCollege,
                name: formData.get('deptName'),
            });
            const updatedDepts = await getDepartmentsByCollege(selectedCollege);
            setDepartments(updatedDepts);
            setSuccess('Department created successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to create department');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBranch = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setLoading(true);
            await createBranch({
                department_id: selectedDepartment,
                name: formData.get('branchName'),
                code: formData.get('branchCode'),
            });
            const updatedBranches = await getBranchesByDepartment(selectedDepartment);
            setBranches(updatedBranches);
            setSuccess('Branch created successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to create branch');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDivision = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setLoading(true);
            await createDivision({
                branch_id: selectedBranch,
                semester: parseInt(formData.get('semester')),
                batch_number: parseInt(formData.get('batchNumber')),
                code: formData.get('divisionCode'),
                mft_id: formData.get('mftId') || null,
            });
            const updatedDivisions = await getDivisionsByBranch(selectedBranch);
            setDivisions(updatedDivisions);
            setSuccess('Division created successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to create division');
        } finally {
            setLoading(false);
        }
    };

    const handleStageMFT = (divisionId, mftId) => {
        setStagedAssignments(prev => ({ ...prev, [divisionId]: mftId }));
    };

    const handleConfirmAssignment = async (divisionId) => {
        const mftId = stagedAssignments[divisionId];
        if (mftId === undefined) return;

        try {
            setLoading(true);
            await updateDivision(divisionId, { mft_id: mftId || null });

            // Clear staged assignment after successful update
            setStagedAssignments(prev => {
                const next = { ...prev };
                delete next[divisionId];
                return next;
            });

            // Optimistic update or refetch
            const updatedDivisions = await getDivisionsByBranch(selectedBranch);
            setDivisions(updatedDivisions);

            setSuccess('Division MFT updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update division MFT');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateMFT = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('mftName');
        const email = formData.get('mftEmail');

        try {
            setLoading(true);
            const password = generatePassword();
            const passwordHash = await hashPassword(password);

            await createMFT({
                name,
                email,
                password_hash: passwordHash,
            });

            // Send credentials via email
            await sendMFTCredentials(email, name, password, 'MFT');

            const updatedMfts = await getAllMFTs();
            setMfts(updatedMfts);

            // Show success modal with credentials
            setCreatedCredentials({ name, email, password, type: 'MFT' });
            setSuccess('MFT created successfully! Credentials sent via email.');
            e.target.reset();
        } catch (err) {
            setError(err.message || 'Failed to create MFT');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignMFT = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const mftId = formData.get('mftId');

        try {
            setLoading(true);
            await updateDivision(selectedDivision, {
                mft_id: mftId || null,
            });
            setSuccess('MFT assigned to division successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to assign MFT');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStudent = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setLoading(true);
            await createStudent({
                enrollment_number: formData.get('enrollmentNumber'),
                name: formData.get('studentName'),
                email: formData.get('studentEmail'),
                division_id: selectedDivision,
            });
            const updatedStudents = await getStudentsByDivision(selectedDivision);
            setStudents(updatedStudents);
            setSuccess('Student added successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to add student');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFaculty = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const name = formData.get('facultyName');
        const email = formData.get('facultyEmail');

        try {
            setLoading(true);

            await createFaculty({
                name,
                email,
                division_id: selectedDivision,
            });

            const updatedFaculty = await getFacultyByDivision(selectedDivision);
            setFaculty(updatedFaculty);
            setSuccess(`Faculty added successfully!`);
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to assign faculty');
        } finally {
            setLoading(false);
        }
    };

    const formCardClass = "bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md";
    const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30";
    const labelClass = "block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1";
    const buttonClass = "w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/30 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2";

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        console.log("handleUpdatePassword called");
        const formData = new FormData(e.target);
        const currentPassword = formData.get('currentPassword');
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
            // Verify current password first (optional security step, but good practice)
            // For now, we'll trust the session and just update
            const passwordHash = await hashPassword(newPassword);
            await updateAdminPassword(admin.id, passwordHash);

            setShowPasswordModal(false);
            setSuccess('Password updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-rose-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <div className="bg-rose-600 dark:bg-rose-900 text-white shadow-xl sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold leading-tight">Admin Dashboard</h1>
                                <p className="text-rose-100 text-sm">Portal Administration</p>
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
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl border-l-4 border-green-500 font-medium shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {success}
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm inline-flex w-full lg:w-auto transition-colors duration-300">
                    {[
                        { id: 'hierarchy', icon: Building2, label: 'Hierarchy' },
                        { id: 'mft', icon: Users, label: 'MFTs' },
                        { id: 'faculty', icon: GraduationCap, label: 'Faculty' },
                        { id: 'students', icon: School, label: 'Students' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            className={`flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeTab === tab.id
                                ? 'bg-rose-600 dark:bg-rose-500 text-white shadow-md'
                                : 'text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                                }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
                    {activeTab === 'hierarchy' && (
                        <>
                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Building2 className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create College</h2>
                                </div>
                                <form onSubmit={handleCreateCollege} className="flex flex-col gap-4">
                                    <div>
                                        <label className={labelClass}>College Name</label>
                                        <input name="collegeName" placeholder="e.g., Parul Institute of Technology" required className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>College Code</label>
                                        <input name="collegeCode" placeholder="e.g., PIT" required className={inputClass} />
                                    </div>
                                    <button type="submit" disabled={loading} className={buttonClass}>
                                        <Plus className="w-5 h-5" />
                                        Create College
                                    </button>
                                </form>
                            </div>

                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <BookOpen className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create Department</h2>
                                </div>
                                <div className="mb-4">
                                    <label className={labelClass}>Select College</label>
                                    <select value={selectedCollege} onChange={(e) => handleCollegeChange(e.target.value)} required className={inputClass}>
                                        <option value="">Choose College...</option>
                                        {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                {selectedCollege && (
                                    <form onSubmit={handleCreateDepartment} className="flex flex-col gap-4 animate-slideDown">
                                        <div>
                                            <label className={labelClass}>Department Name</label>
                                            <input name="deptName" placeholder="e.g., Computer Science" required className={inputClass} />
                                        </div>
                                        <button type="submit" disabled={loading} className={buttonClass}>
                                            <Plus className="w-5 h-5" />
                                            Create Department
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <GitBranch className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create Branch</h2>
                                </div>
                                <div className="mb-4">
                                    <label className={labelClass}>Select Department</label>
                                    <select value={selectedDepartment} onChange={(e) => handleDepartmentChange(e.target.value)} required className={inputClass}>
                                        <option value="">Choose Department...</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                {selectedDepartment && (
                                    <form onSubmit={handleCreateBranch} className="flex flex-col gap-4 animate-slideDown">
                                        <div>
                                            <label className={labelClass}>Branch Name</label>
                                            <input name="branchName" placeholder="e.g., CSE" required className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Branch Code</label>
                                            <input name="branchCode" placeholder="e.g., A" required className={inputClass} />
                                        </div>
                                        <button type="submit" disabled={loading} className={buttonClass}>
                                            <Plus className="w-5 h-5" />
                                            Create Branch
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create Division</h2>
                                </div>
                                <div className="mb-4">
                                    <label className={labelClass}>Select Branch</label>
                                    <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} required className={inputClass}>
                                        <option value="">Choose Branch...</option>
                                        {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                {selectedBranch && (
                                    <form onSubmit={handleCreateDivision} className="flex flex-col gap-4 animate-slideDown">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Semester</label>
                                                <input name="semester" type="number" placeholder="e.g., 8" required className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Batch</label>
                                                <input name="batchNumber" type="number" placeholder="e.g., 1" required className={inputClass} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>Division Code</label>
                                            <input name="divisionCode" placeholder="e.g., 8A1" required className={inputClass} />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Assign MFT (Optional)</label>
                                            <select name="mftId" className={inputClass}>
                                                <option value="">Select MFT...</option>
                                                {mfts.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                                            </select>
                                        </div>
                                        <button type="submit" disabled={loading} className={buttonClass}>
                                            <Plus className="w-5 h-5" />
                                            Create Division
                                        </button>
                                    </form>
                                )}
                            </div>
                        </>
                    )}

                    {activeTab === 'mft' && (
                        <>
                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Create MFT Account</h2>
                                </div>
                                <form onSubmit={handleCreateMFT} className="flex flex-col gap-4">
                                    <div>
                                        <label className={labelClass}>MFT Name</label>
                                        <input name="mftName" placeholder="Full Name" required className={inputClass} />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Email Address</label>
                                        <input name="mftEmail" type="email" placeholder="email@paruluniversity.ac.in" required className={inputClass} />
                                    </div>
                                    <button type="submit" disabled={loading} className={buttonClass}>
                                        <Plus className="w-5 h-5" />
                                        Create MFT
                                    </button>
                                </form>
                            </div>

                            <div className={`${formCardClass} lg:col-span-2`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Existing MFTs</h2>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tl-xl">Name</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tr-xl">Assigned To</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {mfts.map(mft => (
                                                <tr key={mft.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-xs">
                                                                {mft.name.charAt(0)}
                                                            </div>
                                                            <span className="text-gray-900 dark:text-white font-medium">{mft.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{mft.email}</td>
                                                    <td className="px-6 py-4">
                                                        {mft.divisions && mft.divisions.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {mft.divisions.map(div => (
                                                                    <span key={div.id} className="px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded text-xs font-medium">
                                                                        {div.code}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm italic">Unassigned</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Division MFT Assignment Section */}
                            <div className={`${formCardClass} lg:col-span-3 mt-8`}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Layers className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Assign MFTs to Divisions</h2>
                                </div>

                                {/* Filters */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div>
                                        <label className={labelClass}>College</label>
                                        <select value={selectedCollege} onChange={(e) => handleCollegeChange(e.target.value)} className={inputClass}>
                                            <option value="">Select College</option>
                                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Department</label>
                                        <select value={selectedDepartment} onChange={(e) => handleDepartmentChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Branch</label>
                                        <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {selectedBranch && divisions.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tl-xl">Division</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sem / Batch</th>
                                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tr-xl">Assigned MFT</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {divisions.map(div => (
                                                    <tr key={div.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                        <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{div.code}</td>
                                                        <td className="px-6 py-4 text-gray-600 dark:text-gray-400">Sem {div.semester} (Batch {div.batch_number})</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative flex-1">
                                                                    <select
                                                                        value={stagedAssignments[div.id] !== undefined ? stagedAssignments[div.id] : (div.mft_id || '')}
                                                                        onChange={(e) => handleStageMFT(div.id, e.target.value)}
                                                                        className="w-full pl-3 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white transition-all hover:border-rose-300 dark:hover:border-rose-700 appearance-none cursor-pointer"
                                                                    >
                                                                        <option value="">Unassigned</option>
                                                                        {mfts.map(m => (
                                                                            <option key={m.id} value={m.id}>{m.name.split(' ')[0]}</option>
                                                                        ))}
                                                                    </select>
                                                                    <ChevronRight className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                                                                </div>
                                                                <button
                                                                    onClick={() => handleConfirmAssignment(div.id)}
                                                                    disabled={stagedAssignments[div.id] === undefined || stagedAssignments[div.id] === (div.mft_id || '')}
                                                                    className="p-2 bg-rose-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-colors shadow-sm"
                                                                    title="Confirm Assignment"
                                                                >
                                                                    <CheckCircle2 className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (selectedBranch && (
                                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic">
                                        No divisions found in this branch.
                                        <button onClick={() => setActiveTab('division')} className="text-rose-600 hover:text-rose-700 font-medium ml-2 underline">Create one?</button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'faculty' && (
                        <>
                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Search className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Select Division</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>College</label>
                                        <select value={selectedCollege} onChange={(e) => handleCollegeChange(e.target.value)} className={inputClass}>
                                            <option value="">Select College</option>
                                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Department</label>
                                        <select value={selectedDepartment} onChange={(e) => handleDepartmentChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Branch</label>
                                        <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Division</label>
                                        <select value={selectedDivision} onChange={(e) => handleDivisionChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Division</option>
                                            {divisions.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {selectedDivision && (
                                <div className="space-y-8 animate-slideDown">
                                    <div className={formCardClass}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                                <GraduationCap className="w-6 h-6" />
                                            </div>
                                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Assign Faculty</h2>
                                        </div>
                                        <form onSubmit={handleCreateFaculty} className="flex flex-col gap-4">
                                            <div>
                                                <label className={labelClass}>Faculty Name</label>
                                                <input name="facultyName" placeholder="Full Name" required className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Email Address</label>
                                                <input name="facultyEmail" type="email" placeholder="Email" required className={inputClass} />
                                            </div>
                                            <button type="submit" disabled={loading} className={buttonClass}>
                                                <Plus className="w-5 h-5" />
                                                Assign Faculty
                                            </button>
                                        </form>
                                    </div>

                                    <div className={`${formCardClass} lg:col-span-2`}>
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Faculty in Division</h2>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tl-xl">Name</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tr-xl">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {faculty.length === 0 && (
                                                        <tr>
                                                            <td colSpan="2" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">No faculty assigned to this division yet.</td>
                                                        </tr>
                                                    )}
                                                    {faculty.map(f => (
                                                        <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{f.name}</td>
                                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{f.email}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'students' && (
                        <>
                            <div className={formCardClass}>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                        <Search className="w-6 h-6" />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Select Division</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className={labelClass}>College</label>
                                        <select value={selectedCollege} onChange={(e) => handleCollegeChange(e.target.value)} className={inputClass}>
                                            <option value="">Select College</option>
                                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Department</label>
                                        <select value={selectedDepartment} onChange={(e) => handleDepartmentChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Department</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Branch</label>
                                        <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Branch</option>
                                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Division</label>
                                        <select value={selectedDivision} onChange={(e) => handleDivisionChange(e.target.value)} className={inputClass}>
                                            <option value="">Select Division</option>
                                            {divisions.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {selectedDivision && (
                                <div className="space-y-8 animate-slideDown">
                                    <div className={formCardClass}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400">
                                                <School className="w-6 h-6" />
                                            </div>
                                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Add Student</h2>
                                        </div>
                                        <form onSubmit={handleCreateStudent} className="flex flex-col gap-4">
                                            <div>
                                                <label className={labelClass}>Enrollment Number</label>
                                                <input name="enrollmentNumber" placeholder="e.g., 210303105001" required className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Student Name</label>
                                                <input name="studentName" placeholder="Full Name" required className={inputClass} />
                                            </div>
                                            <div>
                                                <label className={labelClass}>Student Email</label>
                                                <input name="studentEmail" type="email" placeholder="Email" required className={inputClass} />
                                            </div>
                                            <button type="submit" disabled={loading} className={buttonClass}>
                                                <Plus className="w-5 h-5" />
                                                Add Student
                                            </button>
                                        </form>
                                    </div>

                                    <div className={`${formCardClass} lg:col-span-2`}>
                                        <div className="flex items-center justify-between mb-6">
                                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Students in Division</h2>
                                            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Total: {students.length}
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                    <tr>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tl-xl">Enrollment</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider rounded-tr-xl">Email</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {students.map(student => (
                                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-mono text-sm">{student.enrollment_number}</td>
                                                            <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{student.name}</td>
                                                            <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{student.email}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
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
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className={labelClass}>New Password</label>
                                <input
                                    name="newPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    className={inputClass}
                                    placeholder="Min. 8 characters"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Confirm New Password</label>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    minLength={8}
                                    className={inputClass}
                                    placeholder="Re-enter new password"
                                />
                            </div>
                            <button type="submit" disabled={loading} className={buttonClass}>
                                {loading ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Credential Success Modal */}
            {createdCredentials && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700 animate-slideUp">
                        <div className="text-center mb-8">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                {createdCredentials.type} Account Created!
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {createdCredentials.type === 'MFT'
                                    ? 'Credentials have been sent to '
                                    : 'Credentials generated for '}
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{createdCredentials.email}</span>
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 mb-8 border border-gray-100 dark:border-gray-700">
                            <div className="space-y-5">
                                <div>
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Name</span>
                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{createdCredentials.name}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Email</span>
                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{createdCredentials.email}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Password</span>
                                    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-600 group">
                                        <code className="text-xl font-mono text-rose-600 dark:text-rose-400 font-bold flex-1 tracking-wide">{createdCredentials.password}</code>
                                        <button
                                            onClick={() => {
                                                navigator.clipboard.writeText(createdCredentials.password);
                                                // Could add a toast here for copy feedback
                                            }}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-rose-600 transition-colors"
                                            title="Copy Password"
                                        >
                                            <Copy className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <p className="text-xs text-rose-500 mt-2 font-medium">Safe this password!</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setCreatedCredentials(null)}
                            className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-all transform hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
