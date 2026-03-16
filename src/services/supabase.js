import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Public client for student operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role for privileged operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: 'supabase-admin-auth', // prevents GoTrueClient duplicate warning
  }
});

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

// ✅ FIX: include password_hash so the dashboard knows whether a password
//    has already been set (used to show "Generate" vs "Regenerate").
//    The hash itself is never displayed — only its presence is checked.
export const getAllMFTs = async () => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .select('id, name, email, password_hash, created_at, invite_sent, divisions(id, code, semester, batch_number)')
    .order('name');

  if (error) throw error;
  return data;
};

export const createMFT = async (mft) => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .insert({ ...mft, invite_sent: false })
    .select('id, name, email, invite_sent, created_at')
    .single();

  if (error) throw error;
  return data;
};

export const setupMFTPassword = async (email, password_hash) => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .update({ password_hash })
    .eq('email', email)
    .select('id, name, email')
    .single();

  if (error) throw error;
  return data;
};

export const setMFTInviteSent = async (email) => {
  const { data, error } = await supabaseAdmin
    .from('mft')
    .update({ invite_sent: true })
    .eq('email', email)
    .select('id, name, email, invite_sent')
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

export const getStudentFullDetails = async (enrollmentNumber) => {
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      division:division_id (
        id,
        code,
        semester,
        batch_number,
        mft_id,
        branch:branch_id (
          id,
          name,
          code,
          department:department_id (
            id,
            name,
            college:college_id (
              id,
              name,
              code
            )
          )
        )
      )
    `)
    .eq('enrollment_number', enrollmentNumber)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
};

export const verifyStudentEnrollment = async (enrollmentNumber, divisionId, studentName, email) => {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('enrollment_number', enrollmentNumber)
    .eq('division_id', divisionId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (!data) return null;

  const nameMatch  = data.name.trim().toLowerCase()  === studentName.trim().toLowerCase();
  const emailMatch = data.email.trim().toLowerCase() === email.trim().toLowerCase();

  if (!nameMatch || !emailMatch) {
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
  const uniqueStudents = deduplicateBy(students, s => s.enrollment_number);
  const { data, error } = await supabaseAdmin
    .from('students')
    .upsert(uniqueStudents, { onConflict: 'enrollment_number' })
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

// ============= BULK UPLOAD OPERATIONS =============

// Helper: deduplicate array by key function (keeps last occurrence)
const deduplicateBy = (arr, keyFn) => {
  const map = new Map();
  arr.forEach((item) => {
    const key = keyFn(item);
    if (key) map.set(key, item);
  });
  return [...map.values()];
};

export const bulkCreateColleges = async (colleges) => {
  const uniqueColleges = deduplicateBy(colleges, c => c.code);
  const { data, error } = await supabaseAdmin
    .from('colleges')
    .upsert(uniqueColleges, { onConflict: 'code' })
    .select();

  if (error) throw error;
  return data;
};

export const bulkCreateDepartments = async (departments) => {
  const uniqueDepartments = deduplicateBy(departments, d => `${d.college_id}_${d.name}`);
  const { data, error } = await supabaseAdmin
    .from('departments')
    .upsert(uniqueDepartments, { onConflict: 'college_id,name' })
    .select();

  if (error) throw error;
  return data;
};

export const bulkCreateBranches = async (branches) => {
  const uniqueBranches = deduplicateBy(branches, b => `${b.department_id}_${b.code}`);

  const { data: existing } = await supabaseAdmin.from('branches').select('department_id, code');
  const existingSet = new Set((existing || []).map(b => `${b.department_id}_${b.code}`));
  const newBranches = uniqueBranches.filter(b => !existingSet.has(`${b.department_id}_${b.code}`));

  if (newBranches.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('branches')
    .insert(newBranches)
    .select();

  if (error) throw error;
  return data;
};

export const bulkCreateDivisions = async (divisions) => {
  const uniqueDivisions = deduplicateBy(divisions, d => d.code);
  const { data, error } = await supabaseAdmin
    .from('divisions')
    .upsert(uniqueDivisions, { onConflict: 'code' })
    .select();

  if (error) throw error;
  return data;
};

export const bulkCreateFaculty = async (facultyList) => {
  const uniqueFaculty = deduplicateBy(facultyList, f => `${f.division_id}_${f.email}`);

  const { data: existing } = await supabaseAdmin.from('faculty').select('division_id, email');
  const existingSet = new Set((existing || []).map(f => `${f.division_id}_${f.email}`));
  const newFaculty = uniqueFaculty.filter(f => !existingSet.has(`${f.division_id}_${f.email}`));

  if (newFaculty.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('faculty')
    .insert(newFaculty)
    .select();

  if (error) throw error;
  return data;
};

export const bulkCreateMFTs = async (mfts) => {
  const uniqueMFTs = deduplicateBy(mfts, m => m.email);

  // Fetch ALL existing MFTs so we can match by name (handles email changes)
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('mft')
    .select('id, name, email');
  if (fetchError) throw fetchError;

  // Build lookup maps
  const byEmail = new Map((existing || []).map(m => [m.email.trim().toLowerCase(), m]));
  const byName  = new Map((existing || []).map(m => [m.name.trim().toLowerCase(),  m]));

  const toInsert = [];
  const toUpdate = []; // { id, name, email }

  for (const m of uniqueMFTs) {
    const emailKey = m.email.trim().toLowerCase();
    const nameKey  = m.name.trim().toLowerCase();

    if (byEmail.has(emailKey)) {
      // Exact email match — update name in case it changed (no-op if same)
      toUpdate.push({ id: byEmail.get(emailKey).id, name: m.name, email: m.email });
    } else if (byName.has(nameKey)) {
      // Same person, email changed — update the email on the existing row
      toUpdate.push({ id: byName.get(nameKey).id, name: m.name, email: m.email });
    } else {
      // Brand new MFT
      toInsert.push({ ...m, invite_sent: false });
    }
  }

  const results = [];

  // Insert new MFTs
  if (toInsert.length > 0) {
    const { data, error } = await supabaseAdmin
      .from('mft')
      .insert(toInsert)
      .select('id, name, email, password_hash, invite_sent, created_at');
    if (error) throw error;
    results.push(...(data || []));
  }

  // Update existing MFTs one by one (Supabase doesn't support bulk update with different values)
  for (const m of toUpdate) {
    const { data, error } = await supabaseAdmin
      .from('mft')
      .update({ name: m.name, email: m.email })
      .eq('id', m.id)
      .select('id, name, email, password_hash, invite_sent, created_at')
      .single();
    if (error) throw error;
    if (data) results.push(data);
  }

  return results;
};

export const getAllDivisionsWithHierarchy = async () => {
  const { data, error } = await supabaseAdmin
    .from('divisions')
    .select(`
      id,
      code,
      semester,
      batch_number,
      mft_id,
      branch:branch_id (
        id,
        name,
        code,
        department:department_id (
          id,
          name,
          college:college_id (
            id,
            name,
            code
          )
        )
      )
    `);

  if (error) throw error;
  return data;
};

export const getAllColleges = async () => {
  const { data, error } = await supabaseAdmin
    .from('colleges')
    .select('*')
    .order('name');

  if (error) throw error;
  return data;
};

export const getAllDepartments = async () => {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('*, college:college_id(id, name, code)')
    .order('name');

  if (error) throw error;
  return data;
};

export const getAllBranches = async () => {
  const { data, error } = await supabaseAdmin
    .from('branches')
    .select('*, department:department_id(id, name, college:college_id(id, name, code))')
    .order('name');

  if (error) throw error;
  return data;
};

export const getAllStudents = async () => {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('*, division:division_id(id, code, branch:branch_id(id, name))')
    .order('name');

  if (error) throw error;
  return data;
};

export const getAllFaculty = async () => {
  const { data, error } = await supabaseAdmin
    .from('faculty')
    .select('*, division:division_id(id, code, branch:branch_id(id, name))')
    .order('name');

  if (error) throw error;
  return data;
};