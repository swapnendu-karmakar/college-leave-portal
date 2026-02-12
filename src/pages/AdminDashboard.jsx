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
} from '../services/supabase';
import { hashPassword, generatePassword } from '../utils/validators';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [activeTab, setActiveTab] = useState('hierarchy');
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [mfts, setMfts] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCollege, setSelectedCollege] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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

    const handleCreateMFT = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        try {
            setLoading(true);
            const password = generatePassword();
            const passwordHash = await hashPassword(password);
            await createMFT({
                name: formData.get('mftName'),
                email: formData.get('mftEmail'),
                password_hash: passwordHash,
            });
            const updatedMfts = await getAllMFTs();
            setMfts(updatedMfts);
            alert(`MFT created! Password: ${password}\n\nPlease save this password and share it with the MFT.`);
            setSuccess('MFT created successfully!');
            e.target.reset();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to create MFT');
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

    const formCardClass = "bg-white rounded-xl p-8 shadow-sm";
    const inputClass = "px-3 py-2 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100";
    const buttonClass = "px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg font-semibold transition-all hover:from-pink-600 hover:to-rose-700 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed";

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-pink-50">
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-8 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
                        <p className="text-pink-100">Portal Administration</p>
                    </div>
                    <button onClick={handleLogout} className="px-6 py-2.5 bg-white/20 border-2 border-white rounded-lg font-semibold transition-all hover:bg-white hover:text-pink-600">
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 py-8">
                {error && <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500">{error}</div>}
                {success && <div className="p-4 mb-6 bg-green-50 text-green-700 rounded-lg border-l-4 border-green-500">{success}</div>}

                <div className="flex gap-4 mb-8 border-b-2 border-gray-200">
                    {['hierarchy', 'mft', 'students'].map(tab => (
                        <button
                            key={tab}
                            className={`px-8 py-4 font-semibold text-lg transition-all border-b-3 ${activeTab === tab ? 'text-pink-600 border-pink-600' : 'text-gray-600 border-transparent hover:text-pink-600'
                                }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'hierarchy' ? 'Manage Hierarchy' : tab === 'mft' ? 'Manage MFTs' : 'Manage Students'}
                        </button>
                    ))}
                </div>

                {activeTab === 'hierarchy' && (
                    <div className="space-y-6">
                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Create College</h2>
                            <form onSubmit={handleCreateCollege} className="flex flex-col gap-4">
                                <input name="collegeName" placeholder="College Name (e.g., PIT)" required className={inputClass} />
                                <input name="collegeCode" placeholder="College Code (e.g., PIT)" required className={inputClass} />
                                <button type="submit" disabled={loading} className={buttonClass}>Create College</button>
                            </form>
                        </div>

                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Create Department</h2>
                            <select value={selectedCollege} onChange={(e) => handleCollegeChange(e.target.value)} required className={inputClass + " mb-4"}>
                                <option value="">Select College</option>
                                {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            {selectedCollege && (
                                <form onSubmit={handleCreateDepartment} className="flex flex-col gap-4">
                                    <input name="deptName" placeholder="Department Name (e.g., BTech)" required className={inputClass} />
                                    <button type="submit" disabled={loading} className={buttonClass}>Create Department</button>
                                </form>
                            )}
                        </div>

                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Create Branch</h2>
                            <select value={selectedDepartment} onChange={(e) => handleDepartmentChange(e.target.value)} required className={inputClass + " mb-4"}>
                                <option value="">Select Department</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            {selectedDepartment && (
                                <form onSubmit={handleCreateBranch} className="flex flex-col gap-4">
                                    <input name="branchName" placeholder="Branch Name (e.g., CSE)" required className={inputClass} />
                                    <input name="branchCode" placeholder="Branch Code (e.g., A)" required className={inputClass} />
                                    <button type="submit" disabled={loading} className={buttonClass}>Create Branch</button>
                                </form>
                            )}
                        </div>

                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Create Division</h2>
                            <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} required className={inputClass + " mb-4"}>
                                <option value="">Select Branch</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            {selectedBranch && (
                                <form onSubmit={handleCreateDivision} className="flex flex-col gap-4">
                                    <input name="semester" type="number" placeholder="Semester (e.g., 8)" required className={inputClass} />
                                    <input name="batchNumber" type="number" placeholder="Batch Number (e.g., 1)" required className={inputClass} />
                                    <input name="divisionCode" placeholder="Division Code (e.g., 8A1)" required className={inputClass} />
                                    <select name="mftId" className={inputClass}>
                                        <option value="">Select MFT (Optional)</option>
                                        {mfts.map(m => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                                    </select>
                                    <button type="submit" disabled={loading} className={buttonClass}>Create Division</button>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'mft' && (
                    <div className="space-y-6">
                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Create MFT Account</h2>
                            <form onSubmit={handleCreateMFT} className="flex flex-col gap-4">
                                <input name="mftName" placeholder="MFT Name" required className={inputClass} />
                                <input name="mftEmail" type="email" placeholder="MFT Email" required className={inputClass} />
                                <button type="submit" disabled={loading} className={buttonClass}>Create MFT</button>
                            </form>
                        </div>

                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Existing MFTs</h2>
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Email</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mfts.map(mft => (
                                        <tr key={mft.id} className="border-b border-gray-100">
                                            <td className="px-4 py-3 text-gray-900">{mft.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{mft.email}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'students' && (
                    <div className="space-y-6">
                        <div className={formCardClass}>
                            <h2 className="text-xl font-bold text-gray-800 mb-6">Select Division</h2>
                            <div className="flex flex-col gap-4">
                                <select value={selectedCollege} onChange={(e) => handleCollegeChange(e.target.value)} className={inputClass}>
                                    <option value="">Select College</option>
                                    {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <select value={selectedDepartment} onChange={(e) => handleDepartmentChange(e.target.value)} className={inputClass}>
                                    <option value="">Select Department</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                                <select value={selectedBranch} onChange={(e) => handleBranchChange(e.target.value)} className={inputClass}>
                                    <option value="">Select Branch</option>
                                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                                <select value={selectedDivision} onChange={(e) => handleDivisionChange(e.target.value)} className={inputClass}>
                                    <option value="">Select Division</option>
                                    {divisions.map(d => <option key={d.id} value={d.id}>{d.code}</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedDivision && (
                            <>
                                <div className={formCardClass}>
                                    <h2 className="text-xl font-bold text-gray-800 mb-6">Add Student</h2>
                                    <form onSubmit={handleCreateStudent} className="flex flex-col gap-4">
                                        <input name="enrollmentNumber" placeholder="Enrollment Number" required className={inputClass} />
                                        <input name="studentName" placeholder="Student Name" required className={inputClass} />
                                        <input name="studentEmail" type="email" placeholder="Student Email" required className={inputClass} />
                                        <button type="submit" disabled={loading} className={buttonClass}>Add Student</button>
                                    </form>
                                </div>

                                <div className={formCardClass}>
                                    <h2 className="text-xl font-bold text-gray-800 mb-6">Students in Division</h2>
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Enrollment</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Name</th>
                                                <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200">Email</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {students.map(student => (
                                                <tr key={student.id} className="border-b border-gray-100">
                                                    <td className="px-4 py-3 text-gray-900">{student.enrollment_number}</td>
                                                    <td className="px-4 py-3 text-gray-900">{student.name}</td>
                                                    <td className="px-4 py-3 text-gray-600">{student.email}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
