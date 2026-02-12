import { useState, useEffect } from 'react';
import {
    getColleges,
    getDepartmentsByCollege,
    getBranchesByDepartment,
    getDivisionsByBranch,
} from '../../services/supabase';

const CascadingDropdowns = ({ onSelectionChange, selectedValues = {} }) => {
    const [colleges, setColleges] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [divisions, setDivisions] = useState([]);

    const [selectedCollege, setSelectedCollege] = useState(selectedValues.collegeId || '');
    const [selectedDepartment, setSelectedDepartment] = useState(selectedValues.departmentId || '');
    const [selectedBranch, setSelectedBranch] = useState(selectedValues.branchId || '');
    const [selectedDivision, setSelectedDivision] = useState(selectedValues.divisionId || '');

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadColleges();
    }, []);

    const loadColleges = async () => {
        try {
            setLoading(true);
            const data = await getColleges();
            setColleges(data);
        } catch (error) {
            console.error('Error loading colleges:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCollegeChange = async (e) => {
        const collegeId = e.target.value;
        setSelectedCollege(collegeId);
        setSelectedDepartment('');
        setSelectedBranch('');
        setSelectedDivision('');
        setDepartments([]);
        setBranches([]);
        setDivisions([]);

        if (collegeId) {
            try {
                setLoading(true);
                const data = await getDepartmentsByCollege(collegeId);
                setDepartments(data);
            } catch (error) {
                console.error('Error loading departments:', error);
            } finally {
                setLoading(false);
            }
        }

        onSelectionChange({
            collegeId,
            departmentId: '',
            branchId: '',
            divisionId: '',
        });
    };

    const handleDepartmentChange = async (e) => {
        const departmentId = e.target.value;
        setSelectedDepartment(departmentId);
        setSelectedBranch('');
        setSelectedDivision('');
        setBranches([]);
        setDivisions([]);

        if (departmentId) {
            try {
                setLoading(true);
                const data = await getBranchesByDepartment(departmentId);
                setBranches(data);
            } catch (error) {
                console.error('Error loading branches:', error);
            } finally {
                setLoading(false);
            }
        }

        onSelectionChange({
            collegeId: selectedCollege,
            departmentId,
            branchId: '',
            divisionId: '',
        });
    };

    const handleBranchChange = async (e) => {
        const branchId = e.target.value;
        setSelectedBranch(branchId);
        setSelectedDivision('');
        setDivisions([]);

        if (branchId) {
            try {
                setLoading(true);
                const data = await getDivisionsByBranch(branchId);
                setDivisions(data);
            } catch (error) {
                console.error('Error loading divisions:', error);
            } finally {
                setLoading(false);
            }
        }

        onSelectionChange({
            collegeId: selectedCollege,
            departmentId: selectedDepartment,
            branchId,
            divisionId: '',
        });
    };

    const handleDivisionChange = (e) => {
        const divisionId = e.target.value;
        setSelectedDivision(divisionId);

        const division = divisions.find(d => d.id === divisionId);

        onSelectionChange({
            collegeId: selectedCollege,
            departmentId: selectedDepartment,
            branchId: selectedBranch,
            divisionId,
            mftId: division?.mft_id || null,
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            <div className="flex flex-col gap-2">
                <label htmlFor="college" className="font-semibold text-gray-700 text-sm">
                    College *
                </label>
                <select
                    id="college"
                    value={selectedCollege}
                    onChange={handleCollegeChange}
                    disabled={loading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-base bg-white transition-all focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer hover:border-purple-400"
                >
                    <option value="">Select College</option>
                    {colleges.map((college) => (
                        <option key={college.id} value={college.id}>
                            {college.name} ({college.code})
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="department" className="font-semibold text-gray-700 text-sm">
                    Department *
                </label>
                <select
                    id="department"
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    disabled={!selectedCollege || loading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-base bg-white transition-all focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer hover:border-purple-400"
                >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                            {dept.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="branch" className="font-semibold text-gray-700 text-sm">
                    Branch *
                </label>
                <select
                    id="branch"
                    value={selectedBranch}
                    onChange={handleBranchChange}
                    disabled={!selectedDepartment || loading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-base bg-white transition-all focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer hover:border-purple-400"
                >
                    <option value="">Select Branch</option>
                    {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                            {branch.name} (Code: {branch.code})
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor="division" className="font-semibold text-gray-700 text-sm">
                    Division *
                </label>
                <select
                    id="division"
                    value={selectedDivision}
                    onChange={handleDivisionChange}
                    disabled={!selectedBranch || loading}
                    required
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg text-base bg-white transition-all focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer hover:border-purple-400"
                >
                    <option value="">Select Division</option>
                    {divisions.map((division) => (
                        <option key={division.id} value={division.id}>
                            {division.code} {division.mft && `- MFT: ${division.mft.name}`}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default CascadingDropdowns;
