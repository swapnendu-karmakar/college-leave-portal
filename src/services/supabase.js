import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Public client for student operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role for privileged operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// ============= COLLEGE OPERATIONS =============
export const getColleges = async () => {
  const { data, error } = await supabase
    .from('colleges')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const createCollege = async (college) => {
  const { data, error } = await supabaseAdmin
    .from('colleges')
    .insert(college)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCollege = async (id, updates) => {
  const { data, error } = await supabaseAdmin
    .from('colleges')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCollege = async (id) => {
  const { error } = await supabaseAdmin
    .from('colleges')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= DEPARTMENT OPERATIONS =============
export const getDepartmentsByCollege = async (collegeId) => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('college_id', collegeId)
    .order('name');

  if (error) throw error;
  return data;
};

export const createDepartment = async (department) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert(department)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDepartment = async (id, updates) => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDepartment = async (id) => {
  const { error } = await supabaseAdmin
    .from('departments')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= BRANCH OPERATIONS =============
export const getBranchesByDepartment = async (departmentId) => {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .eq('department_id', departmentId)
    .order('name');

  if (error) throw error;
  return data;
};

export const createBranch = async (branch) => {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert(branch)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateBranch = async (id, updates) => {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteBranch = async (id) => {
  const { error } = await supabaseAdmin
    .from('branches')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= DIVISION OPERATIONS =============
export const getDivisionsByBranch = async (branchId) => {
  const { data, error } = await supabase
    .from('divisions')
    .select(`
      *,
      mft:mft_id (
        id,
        name,
        email
      )
    `)
    .eq('branch_id', branchId)
    .order('code');

  if (error) throw error;
  return data;
};

export const createDivision = async (division) => {
  const { data, error } = await supabaseAdmin
    .from('divisions')
    .insert(division)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateDivision = async (id, updates) => {
  const { data, error } = await supabaseAdmin
    .from('divisions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteDivision = async (id) => {
  const { error } = await supabaseAdmin
    .from('divisions')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= MFT OPERATIONS =============
export const getAllMFTs = async () => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .select('id, name, email, created_at, divisions(id, code, semester, batch_number)')
    .order('name');

  if (error) throw error;
  return data;
};

export const createMFT = async (mft) => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .insert(mft)
    .select('id, name, email, created_at')
    .single();

  if (error) throw error;
  return data;
};

export const mftLogin = async (email, password) => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
};

export const updateMFTPassword = async (id, passwordHash) => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .update({ password_hash: passwordHash })
    .eq('id', id)
    .select('id, email')
    .single();

  if (error) throw error;
  return data;
};

export const getMFTDivisions = async (mftId) => {
  const { data, error } = await supabase
    .from('divisions')
    .select(`
      *,
      branch:branch_id (
        *,
        department:department_id (
          *,
          college:college_id (*)
        )
      )
    `)
    .eq('mft_id', mftId);

  if (error) throw error;
  return data;
};

// ============= STUDENT OPERATIONS =============
export const getStudentsByDivision = async (divisionId) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('division_id', divisionId)
    .order('enrollment_number');

  if (error) throw error;
  return data;
};

export const verifyStudentEnrollment = async (enrollmentNumber, divisionId, studentName, email) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('enrollment_number', enrollmentNumber)
    .eq('division_id', divisionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

  if (!data) return null;

  // Validate name (case-insensitive) and email
  const nameMatch = data.name.trim().toLowerCase() === studentName.trim().toLowerCase();
  const emailMatch = data.email.trim().toLowerCase() === email.trim().toLowerCase();

  // Also check if mft_id matches? No, mft_id is in division table, student table has division_id.

  if (!nameMatch || !emailMatch) {
    // Return a special object or throw error to distinguish from "not found"
    // But for simplicity in UI, we can just return null or throw.
    // The UI currently checks `if (!student)`.
    // Let's throw a specific error so we can show it to the user.
    throw new Error('Student name or email does not match the enrollment record.');
  }

  return data;
};

export const createStudent = async (student) => {
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert(student)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const bulkCreateStudents = async (students) => {
  const { data, error } = await supabaseAdmin
    .from('students')
    .insert(students)
    .select();

  if (error) throw error;
  return data;
};

export const updateStudent = async (id, updates) => {
  const { data, error } = await supabaseAdmin
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteStudent = async (id) => {
  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= FACULTY OPERATIONS =============
export const getFacultyByDivision = async (divisionId) => {
  const { data, error } = await supabaseAdmin
    .from('faculty')
    .select('*')
    .eq('division_id', divisionId)
    .order('name');

  if (error) throw error;
  return data;
};

export const createFaculty = async (faculty) => {
  const { data, error } = await supabaseAdmin
    .from('faculty')
    .insert(faculty)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteFaculty = async (id) => {
  const { error } = await supabaseAdmin
    .from('faculty')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ============= LEAVE APPLICATION OPERATIONS =============
export const generateApplicationId = () => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `LA-${timestamp}-${randomStr}`.toUpperCase();
};

export const createLeaveApplication = async (application) => {
  const applicationId = generateApplicationId();
  const { data, error } = await supabase
    .from('leave_applications')
    .insert({ ...application, application_id: applicationId })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getApplicationById = async (applicationId) => {
  const { data, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      college:college_id (name),
      department:department_id (name),
      branch:branch_id (name),
      division:division_id (code),
      proofs (*)
    `)
    .eq('application_id', applicationId)
    .single();

  if (error) throw error;
  return data;
};

export const getApplicationsByMFT = async (mftId) => {
  const { data, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      division:division_id (code),
      proofs (*)
    `)
    .eq('mft_id', mftId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const updateApplicationStatus = async (id, status, reviewedAt = new Date().toISOString()) => {
  const { data, error } = await supabaseAdmin
    .from('leave_applications')
    .update({ status, reviewed_at: reviewedAt })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProofStatus = async (applicationId, proofStatus) => {
  const { data, error } = await supabaseAdmin
    .from('leave_applications')
    .update({ proof_status: proofStatus })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============= PROOF OPERATIONS =============
export const uploadProof = async (file, applicationId) => {
  const fileExt = file.name.split('.').pop();
  const fileNamePrefix = applicationId || 'temp';
  const fileName = `${fileNamePrefix}-${Date.now()}.${fileExt}`;
  const filePath = `proofs/${fileName}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('leave-proofs')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('leave-proofs')
    .getPublicUrl(filePath);

  return { filePath, publicUrl: urlData.publicUrl, fileName: file.name };
};

export const deleteStorageFile = async (filePath) => {
  const { error } = await supabase.storage
    .from('leave-proofs')
    .remove([filePath]);

  if (error) throw error;
};

export const createProof = async (proof) => {
  const { data, error } = await supabase
    .from('proofs')
    .insert(proof)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProofReviewStatus = async (id, status) => {
  const { data, error } = await supabaseAdmin
    .from('proofs')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ============= ADMIN OPERATIONS =============
export const checkAdminExists = async () => {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id')
    .limit(1);

  if (error) throw error;
  return data && data.length > 0;
};

export const createAdmin = async (admin) => {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .insert(admin)
    .select('id, email, created_at')
    .single();

  if (error) throw error;
  return data;
};

export const adminLogin = async (email) => {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('*')
    .eq('email', email)
    .single();

  if (error) throw error;
  return data;
};

export const updateAdminPassword = async (id, passwordHash) => {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .update({ password_hash: passwordHash })
    .eq('id', id)
    .select('id, email')
    .single();

  if (error) throw error;
  return data;
};
