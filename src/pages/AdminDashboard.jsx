import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getColleges,
    getAllMFTs,
    getAllDivisionsWithHierarchy,
    getAllDepartments,
    getAllBranches,
    bulkCreateColleges,
    bulkCreateDepartments,
    bulkCreateBranches,
    bulkCreateDivisions,
    bulkCreateStudents,
    bulkCreateFaculty,
    bulkCreateMFTs,
    updateAdminPassword,
    setupMFTPassword,
    setMFTInviteSent,
    getAllStudents,
    getAllFaculty
} from '../services/supabase';
import {
    hashPassword,
    generatePassword,
    parseExcelFile,
    validateCollegesData,
    validateDepartmentsData,
    validateBranchesData,
    validateDivisionsData,
    validateStudentsData,
    validateFacultyData,
    validateMFTData,
    downloadTemplate,
} from '../utils/validators';
import { sendMFTCredentials } from '../services/emailService';
import { useTheme } from '../context/ThemeContext';
import {
    LogOut, Lock, X, Sun, Moon, ShieldCheck, Upload, Download,
    FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ChevronDown,
    ChevronRight, Trash2, Eye, EyeOff, Send, Mail, Database,
    KeyRound, RefreshCw, Copy, Check,
} from 'lucide-react';

const SHEET_ORDER = ['Colleges', 'Departments', 'Branches', 'MFT', 'Divisions', 'Students', 'Faculty'];

const SHEET_COLORS = {
    Colleges:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-300',     border: 'border-blue-200 dark:border-blue-800',     badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
    Departments: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' },
    Branches:    { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-800',   badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
    MFT:         { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
    Divisions:   { bg: 'bg-cyan-50 dark:bg-cyan-900/20',     text: 'text-cyan-700 dark:text-cyan-300',     border: 'border-cyan-200 dark:border-cyan-800',     badge: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300' },
    Students:    { bg: 'bg-rose-50 dark:bg-rose-900/20',     text: 'text-rose-700 dark:text-rose-300',     border: 'border-rose-200 dark:border-rose-800',     badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
    Faculty:     { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800', badge: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
};

// ─────────────────────────────────────────────────────────────
//  MFTPasswordCell  -  per-row password generate / view / send
//
//  State matrix:
//  STATE 1: no password_hash in DB, no _plainPassword  -> [Generate Password] green button
//  STATE 2: password_hash in DB, no _plainPassword
//           invite_sent=false -> "Password set" amber badge + [Regenerate] + [Regenerate & Send]
//           invite_sent=true  -> "Credentials sent" green badge + [Regenerate]
//  STATE 3: _plainPassword exists in session
//           invite_sent=false -> password field (show/hide/copy) + [Regenerate] + [Send to MFT]
//           invite_sent=true  -> password field + [Regenerate] + "Email Sent" badge
// ─────────────────────────────────────────────────────────────
const MFTPasswordCell = ({ mft, onGenerate, onGenerateAndSend, onSendEmail, generatingFor, sendingFor }) => {
    const [showPw, setShowPw] = useState(false);
    const [copied, setCopied] = useState(false);

    const plain        = mft._plainPassword || null;  // lives in session memory only
    const hasHashInDB  = !!mft.password_hash;
    const isGenerating = generatingFor === mft.email;
    const isSending    = sendingFor    === mft.email;
    const busy         = isGenerating || isSending;

    const handleCopy = () => {
        if (!plain) return;
        navigator.clipboard.writeText(plain);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── STATE 1: No password ever generated ──
    if (!hasHashInDB && !plain) {
        return (
            <div className="flex items-center justify-end">
                <button
                    onClick={() => onGenerate(mft)}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-all"
                >
                    {isGenerating
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <KeyRound className="w-3.5 h-3.5" />}
                    Generate Password
                </button>
            </div>
        );
    }

    // ── STATE 2: Password in DB but plain text not in session ──
    if (hasHashInDB && !plain) {
        return (
            <div className="flex flex-col items-end gap-2">
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                    mft.invite_sent
                        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                        : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                }`}>
                    {mft.invite_sent
                        ? <><CheckCircle2 className="w-3.5 h-3.5" />&nbsp;Credentials sent</>
                        : <><AlertCircle className="w-3.5 h-3.5" />&nbsp;Email not sent yet</>
                    }
                </span>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Regenerate only — shows new password in cell without sending */}
                    <button
                        onClick={() => onGenerate(mft)}
                        disabled={busy}
                        title="Generate a new password and show it here"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-50 transition-all"
                    >
                        {isGenerating
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <RefreshCw className="w-3 h-3" />}
                        Regenerate
                    </button>

                    {/* Regenerate + Send in one click (only when email not sent yet) */}
                    {!mft.invite_sent ? (
                        <button
                            onClick={() => onGenerateAndSend(mft)}
                            disabled={busy}
                            title="Generate a new password and immediately email it to this MFT"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-all"
                        >
                            {isSending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Mail className="w-3.5 h-3.5" />}
                            Regenerate &amp; Send
                        </button>
                    ) : (
                        /* Already sent — still allow resend after regenerating */
                        <button
                            onClick={() => onGenerateAndSend(mft)}
                            disabled={busy}
                            title="Generate a new password and resend to MFT"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-50 transition-all"
                        >
                            {isSending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Send className="w-3.5 h-3.5" />}
                            Resend
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ── STATE 3: Password just generated this session ──
    return (
        <div className="flex flex-col items-end gap-2">
            {/* Password display */}
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5">
                <span className="font-mono text-xs text-gray-800 dark:text-gray-200 tracking-wider select-all" style={{ minWidth: '120px' }}>
                    {showPw ? plain : '\u2022'.repeat(plain.length)}
                </span>
                <button onClick={() => setShowPw(v => !v)} title={showPw ? 'Hide' : 'Show'} className="ml-1 p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handleCopy} title="Copy" className="p-0.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                    onClick={() => onGenerate(mft)}
                    disabled={busy}
                    title="Overwrite with a new password"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-50 transition-all"
                >
                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Regenerate
                </button>

                {mft.invite_sent ? (
                    <span className="inline-flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Email Sent
                    </span>
                ) : (
                    <button
                        onClick={() => onSendEmail(mft)}
                        disabled={busy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-all"
                    >
                        {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                        Send to MFT
                    </button>
                )}
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────
//  AdminDashboard
// ─────────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [admin, setAdmin] = useState(null);

    // Upload state
    const [uploadedFile,   setUploadedFile]   = useState(null);
    const [parsedSheets,   setParsedSheets]   = useState(null);
    const [sheetNames,     setSheetNames]     = useState([]);
    const [expandedSheet,  setExpandedSheet]  = useState(null);
    const [isDragging,     setIsDragging]     = useState(false);

    // Processing
    const [processing,     setProcessing]     = useState(false);
    const [processResults, setProcessResults] = useState(null);
    const [currentStep,    setCurrentStep]    = useState('');

    // DB data
    const [globalData,  setGlobalData]  = useState({ Colleges: [], Departments: [], Branches: [], Divisions: [], Students: [], Faculty: [], MFT: [] });
    const [loadingData, setLoadingData] = useState(false);

    // UI
    const [error,             setError]             = useState('');
    const [success,           setSuccess]           = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showUploadModal,   setShowUploadModal]   = useState(false);

    // MFT credential state
    const [generatingPassword, setGeneratingPassword] = useState(null); // email string | null
    const [sendingEmail,       setSendingEmail]        = useState(null); // email string | null

    // ── auth ──
    useEffect(() => {
        const d = sessionStorage.getItem('admin');
        if (!d) { navigate('/admin/login'); return; }
        setAdmin(JSON.parse(d));
    }, [navigate]);

    useEffect(() => { loadAllData(); }, []);

    const loadAllData = async () => {
        setLoadingData(true);
        try {
            const [colleges, departments, branches, divisions, students, faculty, mfts] = await Promise.all([
                getColleges(), getAllDepartments(), getAllBranches(),
                getAllDivisionsWithHierarchy(), getAllStudents(), getAllFaculty(), getAllMFTs(),
            ]);
            setGlobalData({ Colleges: colleges||[], Departments: departments||[], Branches: branches||[], Divisions: divisions||[], Students: students||[], Faculty: faculty||[], MFT: mfts||[] });
        } catch (err) {
            setError('Failed to load data: ' + err.message);
        } finally {
            setLoadingData(false);
        }
    };

    const handleLogout = () => { sessionStorage.removeItem('admin'); navigate('/admin/login'); };

    // ── file handling ──
    const handleFileSelect = useCallback(async (file) => {
        if (!file) return;
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!validTypes.includes(file.type) && !['xlsx','xls','csv'].includes(ext)) {
            setError('Please upload an Excel (.xlsx, .xls) or CSV file.');
            return;
        }
        try {
            setProcessing(true); setError(''); setProcessResults(null);
            const { sheetNames: names, sheets } = await parseExcelFile(file);
            setUploadedFile(file); setSheetNames(names); setParsedSheets(sheets); setExpandedSheet(names[0]||null);
            setSuccess(`"${file.name}" loaded — ${names.length} entity type(s) detected.`);
            setTimeout(() => setSuccess(''), 4000);
        } catch (err) {
            setError('Failed to parse file: ' + err.message);
        } finally {
            setProcessing(false);
        }
    }, []);

    const handleDrop      = useCallback((e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }, [handleFileSelect]);
    const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);
    const clearFile = () => { setUploadedFile(null); setParsedSheets(null); setSheetNames([]); setExpandedSheet(null); setProcessResults(null); setError(''); setSuccess(''); };

    // ── process all sheets ──
    const handleProcessAll = async () => {
        if (!parsedSheets) return;
        setProcessing(true); setError(''); setSuccess('');
        const results = {};
        try {
            const run = async (key, validateFn, bulkFn, extraArgs = []) => {
                if (!parsedSheets[key]?.length) return null;
                setCurrentStep(`Processing ${key}...`);
                const validated = validateFn(parsedSheets[key], ...extraArgs);
                const valid = validated.filter(r => r.valid);
                const inserted = valid.length ? await bulkFn(valid.map(r => r.data)) : [];
                results[key] = { total: validated.length, success: inserted.length, errors: validated.filter(r => !r.valid) };
            };

            await run('Colleges',    validateCollegesData,    bulkCreateColleges);
            const allColleges    = await getColleges();
            await run('Departments', validateDepartmentsData, bulkCreateDepartments, [allColleges]);
            const allDepartments = await getAllDepartments();
            await run('Branches',    validateBranchesData,    bulkCreateBranches,    [allDepartments]);
            const allBranches    = await getAllBranches();
            await run('MFT',         validateMFTData,         bulkCreateMFTs);
            const allMFTs        = await getAllMFTs();
            await run('Divisions',   validateDivisionsData,   bulkCreateDivisions,   [allBranches, allMFTs]);

            const allDivisions = await getAllDivisionsWithHierarchy();
            const divisionsMap = {};
            allDivisions.forEach(d => { if (d.code) divisionsMap[String(d.code).trim().toLowerCase()] = d.id; });

            await run('Students', validateStudentsData, bulkCreateStudents, [divisionsMap]);
            await run('Faculty',  validateFacultyData,  bulkCreateFaculty,  [divisionsMap]);

            setProcessResults(results);
            const ok  = Object.values(results).reduce((s, r) => s + r.success, 0);
            const bad = Object.values(results).reduce((s, r) => s + r.errors.length, 0);
            setSuccess(`Done! ${ok} records inserted${bad ? `, ${bad} rows had errors` : ''}.`);
        } catch (err) {
            setError(`Failed at "${currentStep}": ${err.message}`);
        } finally {
            setProcessing(false); setCurrentStep('');
        }
    };

    // ─────────────────────────────────────────────────────────────
    //  MFT password flow
    //  1. Generate  → creates plain pw, hashes it, saves to DB,
    //                 stores plain pw temporarily in _plainPassword
    //  2. Show/hide / copy available immediately after generation
    //  3. Send      → emails {email, name, password} to MFT,
    //                 marks invite_sent = true
    // ─────────────────────────────────────────────────────────────
    const handleGeneratePassword = async (mft) => {
        setGeneratingPassword(mft.email);
        try {
            const plain  = generatePassword(12);
            const hashed = await hashPassword(plain);
            await setupMFTPassword(mft.email, hashed);
            setGlobalData(prev => ({
                ...prev,
                MFT: prev.MFT.map(m =>
                    m.email === mft.email
                        ? { ...m, password_hash: hashed, _plainPassword: plain, invite_sent: false }
                        : m
                ),
            }));
            setSuccess(`Password generated for ${mft.name}. Review it, then click "Send to MFT".`);
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            setError(`Could not generate password for ${mft.email}: ${err.message}`);
            setTimeout(() => setError(''), 5000);
        } finally {
            setGeneratingPassword(null);
        }
    };

    const handleSendCredentialsEmail = async (mft) => {
        if (!mft._plainPassword) {
            setError('Generate a password first before sending the email.');
            return;
        }
        setSendingEmail(mft.email);
        try {
            await sendMFTCredentials(mft.email, mft.name, mft._plainPassword);
            await setMFTInviteSent(mft.email);
            setGlobalData(prev => ({
                ...prev,
                MFT: prev.MFT.map(m => m.email === mft.email ? { ...m, invite_sent: true } : m),
            }));
            setSuccess(`Credentials emailed to ${mft.email}!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(`Failed to send email to ${mft.email}: ${err.message}`);
            setTimeout(() => setError(''), 5000);
        } finally {
            setSendingEmail(null);
        }
    };

    // Bulk: generate + immediately send for each unsent MFT sequentially
    const handleGenerateAndSendAll = async () => {
        const unsent = globalData.MFT.filter(m => !m.password_hash);
        for (const mft of unsent) {
            // Generate
            const plain  = generatePassword(12);
            const hashed = await hashPassword(plain);
            setGeneratingPassword(mft.email);
            try {
                await setupMFTPassword(mft.email, hashed);
                // Send immediately
                setSendingEmail(mft.email);
                await sendMFTCredentials(mft.email, mft.name, plain);
                await setMFTInviteSent(mft.email);
                setGlobalData(prev => ({
                    ...prev,
                    MFT: prev.MFT.map(m =>
                        m.email === mft.email
                            ? { ...m, password_hash: hashed, _plainPassword: plain, invite_sent: true }
                            : m
                    ),
                }));
            } catch (err) {
                setError(`Failed for ${mft.email}: ${err.message}`);
            } finally {
                setGeneratingPassword(null);
                setSendingEmail(null);
            }
        }
        setSuccess('All pending MFT credentials generated and sent!');
        setTimeout(() => setSuccess(''), 4000);
    };

    // Single-row: generate a new password AND immediately email it (used by STATE 2 "Regenerate & Send")
    const handleGenerateAndSendOne = async (mft) => {
        const plain  = generatePassword(12);
        const hashed = await hashPassword(plain);
        setGeneratingPassword(mft.email);
        try {
            await setupMFTPassword(mft.email, hashed);
            setSendingEmail(mft.email);
            await sendMFTCredentials(mft.email, mft.name, plain);
            await setMFTInviteSent(mft.email);
            setGlobalData(prev => ({
                ...prev,
                MFT: prev.MFT.map(m =>
                    m.email === mft.email
                        ? { ...m, password_hash: hashed, _plainPassword: plain, invite_sent: true }
                        : m
                ),
            }));
            setSuccess(`Credentials generated and sent to ${mft.email}!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(`Failed for ${mft.email}: ${err.message}`);
            setTimeout(() => setError(''), 5000);
        } finally {
            setGeneratingPassword(null);
            setSendingEmail(null);
        }
    };

    // ── admin pw change ──
    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const np = fd.get('newPassword'), cp = fd.get('confirmPassword');
        if (np !== cp)     { setError('Passwords do not match'); return; }
        if (np.length < 8) { setError('Minimum 8 characters'); return; }
        try {
            setProcessing(true);
            await updateAdminPassword(admin.id, await hashPassword(np));
            setShowPasswordModal(false);
            setSuccess('Password updated!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message || 'Failed to update password');
        } finally {
            setProcessing(false);
        }
    };

    // ── style tokens ──
    const formCardClass = "bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:shadow-md";
    const inputClass    = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30";
    const labelClass    = "block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1";
    const buttonClass   = "w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-rose-500/30 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2";

    const detectedSheets = sheetNames.filter(n => SHEET_ORDER.includes(n));
    const unknownSheets  = sheetNames.filter(n => !SHEET_ORDER.includes(n));

    return (
        <div className="min-h-screen bg-rose-50 dark:bg-gray-900 transition-colors duration-300">

            {/* ── Header ── */}
            <div className="bg-rose-600 dark:bg-rose-900 text-white shadow-xl sticky top-0 z-50 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-inner">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold leading-tight">Admin Dashboard</h1>
                                <p className="text-rose-100 text-sm">Excel Bulk Upload</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                            <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-105 active:scale-95">
                                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <div className="h-8 w-px bg-white/20 hidden md:block" />
                            <button onClick={() => setShowPasswordModal(true)} className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-105 active:scale-95" title="Change Password">
                                <Lock className="w-5 h-5" />
                            </button>
                            <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-semibold transition-all backdrop-blur-sm hover:scale-105 active:scale-95 text-sm sm:text-base">
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">

                {/* Banners */}
                {error && (
                    <div className="flex items-start gap-3 p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border-l-4 border-red-500 font-medium shadow-sm">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">{error}</div>
                        <button onClick={() => setError('')}><X className="w-4 h-4 text-red-400 hover:text-red-600" /></button>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 p-4 mb-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-xl border-l-4 border-green-500 font-medium shadow-sm">
                        <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">{success}</div>
                    </div>
                )}

                {/* ── Upload Modal ── */}
                {showUploadModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative">
                            <div className="sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center z-10">
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileSpreadsheet className="w-7 h-7 text-rose-500" /> Import Excel Data
                                </h2>
                                <button onClick={() => setShowUploadModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Download template */}
                                    <div className={formCardClass}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400"><Download className="w-6 h-6" /></div>
                                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Step 1</h2>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm leading-relaxed">Download the template, fill in your data following the same format, then upload it.</p>
                                        <div className="space-y-3 mb-6">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Entity types:</div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {SHEET_ORDER.map(n => <span key={n} className={`px-2 py-1 rounded-lg text-xs font-medium ${SHEET_COLORS[n]?.badge||'bg-gray-100 text-gray-600'}`}>{n}</span>)}
                                            </div>
                                        </div>
                                        <button onClick={downloadTemplate} className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold transition-all transform hover:-translate-y-0.5 hover:shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                            <Download className="w-5 h-5" /> Download Template
                                        </button>
                                    </div>

                                    {/* Upload area */}
                                    <div className={`${formCardClass} lg:col-span-2`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400"><Upload className="w-6 h-6" /></div>
                                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Step 2: Upload Excel File</h2>
                                        </div>
                                        {!uploadedFile ? (
                                            <div
                                                onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
                                                onClick={() => document.getElementById('excel-file-input').click()}
                                                className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${isDragging ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 scale-[1.02]' : 'border-gray-200 dark:border-gray-700 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10'}`}
                                            >
                                                <input id="excel-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={e => handleFileSelect(e.target.files[0])} className="hidden" />
                                                <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                    {processing ? <Loader2 className="w-8 h-8 text-rose-500 animate-spin" /> : <FileSpreadsheet className="w-8 h-8 text-rose-500" />}
                                                </div>
                                                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{processing ? 'Parsing…' : 'Drag & drop your Excel file here'}</p>
                                                <p className="text-sm text-gray-400 dark:text-gray-500">or click to browse • .xlsx, .xls, .csv</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700">
                                                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                                        <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-800 dark:text-white truncate">{uploadedFile.name}</p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400">{(uploadedFile.size/1024).toFixed(1)} KB • {detectedSheets.length} entity type(s){unknownSheets.length > 0 && `, ${unknownSheets.length} unknown`}</p>
                                                    </div>
                                                    <button onClick={clearFile} className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                                </div>
                                                <div className="space-y-3">
                                                    {SHEET_ORDER.filter(n => sheetNames.includes(n)).map(name => {
                                                        const rows   = parsedSheets[name]||[];
                                                        const colors = SHEET_COLORS[name];
                                                        const isExp  = expandedSheet === name;
                                                        const headers = rows.length ? Object.keys(rows[0]) : [];
                                                        return (
                                                            <div key={name} className={`rounded-xl border ${colors.border} overflow-hidden`}>
                                                                <button onClick={() => setExpandedSheet(isExp ? null : name)} className={`w-full flex items-center justify-between px-5 py-3.5 ${colors.bg}`}>
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${colors.badge}`}>{name}</span>
                                                                        <span className="text-sm text-gray-600 dark:text-gray-400">{rows.length} row{rows.length !== 1 ? 's' : ''}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <Eye className="w-4 h-4 text-gray-400" />
                                                                        {isExp ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                                                    </div>
                                                                </button>
                                                                {isExp && rows.length > 0 && (
                                                                    <div className="overflow-x-auto border-t border-gray-100 dark:border-gray-700">
                                                                        <table className="w-full text-sm">
                                                                            <thead><tr className="bg-gray-50 dark:bg-gray-800">{headers.map((h,i) => <th key={i} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}</tr></thead>
                                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                                {rows.slice(0,5).map((row,ri) => (
                                                                                    <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                                                        {headers.map((h,ci) => <td key={ci} className="px-4 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">{String(row[h])}</td>)}
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                        {rows.length > 5 && <div className="px-4 py-2 text-center text-xs text-gray-400 bg-gray-50 dark:bg-gray-800">…and {rows.length-5} more row(s)</div>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {unknownSheets.length > 0 && <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 rounded-xl"><strong>Unknown types (skipped):</strong> {unknownSheets.join(', ')}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 3 */}
                                {uploadedFile && detectedSheets.length > 0 && (
                                    <div className={`mt-8 ${formCardClass}`}>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-xl text-rose-600 dark:text-rose-400"><CheckCircle2 className="w-6 h-6" /></div>
                                            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Step 3: Process & Import</h2>
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                                            Order: {detectedSheets.filter(s => SHEET_ORDER.includes(s)).sort((a,b) => SHEET_ORDER.indexOf(a)-SHEET_ORDER.indexOf(b)).join(' → ')}
                                        </p>
                                        <button onClick={handleProcessAll} disabled={processing} className={buttonClass}>
                                            {processing ? <><Loader2 className="w-5 h-5 animate-spin" />{currentStep||'Processing…'}</> : <><Upload className="w-5 h-5" />Import All Data</>}
                                        </button>
                                        {processing && (
                                            <div className="mt-6">
                                                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400"><Loader2 className="w-4 h-4 animate-spin text-rose-500" /><span>{currentStep}</span></div>
                                                <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div className="bg-rose-500 h-full rounded-full animate-pulse" style={{width:'60%'}} /></div>
                                            </div>
                                        )}
                                        {processResults && (
                                            <div className="mt-8 space-y-4">
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Import Results</h3>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {Object.entries(processResults).map(([sn, result]) => {
                                                        const colors = SHEET_COLORS[sn];
                                                        return (
                                                            <div key={sn} className={`rounded-xl p-4 border ${colors?.border||'border-gray-200'} ${colors?.bg||'bg-gray-50'}`}>
                                                                <div className="flex items-center justify-between mb-3">
                                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{sn}</span>
                                                                    {result.errors.length === 0 ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-amber-500" />}
                                                                </div>
                                                                <div className="space-y-1 text-sm">
                                                                    <div className="flex justify-between"><span className="text-gray-500">Total:</span><span className="font-semibold text-gray-800 dark:text-white">{result.total}</span></div>
                                                                    <div className="flex justify-between"><span className="text-green-600">Inserted:</span><span className="font-semibold text-green-700 dark:text-green-300">{result.success}</span></div>
                                                                    {result.errors.length > 0 && <div className="flex justify-between"><span className="text-red-600">Errors:</span><span className="font-semibold text-red-700 dark:text-red-300">{result.errors.length}</span></div>}
                                                                </div>
                                                                {result.errors.length > 0 && (
                                                                    <div className="mt-3 space-y-1">
                                                                        {result.errors.slice(0,3).map((e,i) => <div key={i} className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">Row {e.rowIndex}: {e.errors.join(', ')}</div>)}
                                                                        {result.errors.length > 3 && <div className="text-xs text-gray-400">…and {result.errors.length-3} more</div>}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Instructions */}
                                {!uploadedFile && (
                                    <div className={`mt-8 ${formCardClass}`}>
                                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">How It Works</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {[
                                                {n:'1',title:'Download Template',desc:'Get the template: "Data" sheet for hierarchy, division-named sheets for students, and "{code}_faculty" sheets for faculty.'},
                                                {n:'2',title:'Fill Your Data',desc:'Define the college→dept→branch→division hierarchy in "Data". Add student and faculty sheets per division.'},
                                                {n:'3',title:'Upload & Import',desc:'Upload the file, preview detected data, then click Import. After import, generate MFT passwords and send them via email.'},
                                            ].map(s => (
                                                <div key={s.n} className="text-center">
                                                    <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                        <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{s.n}</span>
                                                    </div>
                                                    <h3 className="font-bold text-gray-800 dark:text-white mb-2">{s.title}</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                                            <h4 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-4">Column Reference</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                                <div><span className="font-bold text-gray-700 dark:text-gray-300">Data sheet</span><p className="text-gray-500 font-mono text-xs mt-1">college_name, college_code, department_name, branch_name, branch_code, division_code, semester, batch_number, mft_name, mft_email</p></div>
                                                <div><span className="font-bold text-gray-700 dark:text-gray-300">Student sheets</span><p className="text-gray-500 font-mono text-xs mt-1">enrollment_number, name, email, division_code</p></div>
                                                <div><span className="font-bold text-gray-700 dark:text-gray-300">Faculty sheets</span><p className="text-gray-500 font-mono text-xs mt-1">name, email, division_code, subject</p></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Database Records ── */}
                <div className="mt-2">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Database className="w-6 h-6 text-rose-500" /> Database Records
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View all entity data loaded in the system. Generate &amp; send MFT credentials from the MFT section.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={loadAllData} disabled={loadingData} className="px-5 py-2.5 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border-2 border-transparent rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center gap-2 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/50 font-bold">
                                <Loader2 className={`w-4 h-4 ${loadingData ? 'animate-spin text-rose-500' : ''}`} /> Sync
                            </button>
                            <button onClick={() => setShowUploadModal(true)} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 shadow-rose-500/30 transform hover:-translate-y-0.5 active:scale-95">
                                <Upload className="w-4 h-4" /> Import Data
                            </button>
                        </div>
                    </div>

                    {loadingData ? (
                        <div className="p-12 flex justify-center items-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(globalData).map(([title, records]) => {
                                const colors    = SHEET_COLORS[title] || SHEET_COLORS['Colleges'];
                                const isMFT     = title === 'MFT';
                                // "pending" = no password ever generated (password_hash is null)
                                const unsentCnt = isMFT ? records.filter(m => !m.password_hash).length : 0;

                                return (
                                    <details key={title} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                                        <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors select-none">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-xl border ${colors.bg} ${colors.text} ${colors.border}`}>
                                                    <Database className="w-5 h-5" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${colors.badge}`}>{records.length} records</span>
                                                {isMFT && unsentCnt > 0 && (
                                                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                                        {unsentCnt} pending
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {isMFT && unsentCnt > 0 && (
                                                    <button
                                                        onClick={e => { e.preventDefault(); handleGenerateAndSendAll(); }}
                                                        disabled={!!generatingPassword || !!sendingEmail}
                                                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {(!!generatingPassword || !!sendingEmail)
                                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            : <KeyRound className="w-3.5 h-3.5" />}
                                                        Generate &amp; Send All ({unsentCnt})
                                                    </button>
                                                )}
                                                <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center group-open:rotate-180 transition-transform">
                                                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                                </div>
                                            </div>
                                        </summary>

                                        <div className="border-t border-gray-100 dark:border-gray-700 overflow-x-auto max-h-[500px] overflow-y-auto">
                                            {records.length === 0 ? (
                                                <div className="p-8 text-center text-gray-500 dark:text-gray-400">No {title.toLowerCase()} found in the database.</div>
                                            ) : (
                                                <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400">
                                                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 sticky top-0 z-10">
                                                        <tr>
                                                            <th className="px-6 py-4">Name / Code</th>
                                                            {(isMFT || title==='Students' || title==='Faculty') && <th className="px-6 py-4">Email</th>}
                                                            <th className="px-6 py-4">Details</th>
                                                            {isMFT && <th className="px-6 py-4 text-right" style={{minWidth:'280px'}}>Password &amp; Actions</th>}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {records.map((item, idx) => (
                                                            <tr key={item.id||idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                                    {item.name || item.code || item.enrollment_number}
                                                                </td>

                                                                {(isMFT || title==='Students' || title==='Faculty') && (
                                                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{item.email}</td>
                                                                )}

                                                                <td className="px-6 py-4">
                                                                    {title==='Departments' && item.college    && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">College: {item.college.code}</span>}
                                                                    {title==='Branches'    && item.department && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Dept: {item.department.name}</span>}
                                                                    {title==='Divisions'   && item.branch     && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Branch: {item.branch.code}</span>}
                                                                    {title==='Students'    && item.division   && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Div: {item.division.code}</span>}
                                                                    {title==='Faculty'     && item.division   && <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Div: {item.division.code}</span>}
                                                                    {isMFT && item.divisions?.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {item.divisions.map(d => <span key={d.id} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">{d.code}</span>)}
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                {isMFT && (
                                                                    <td className="px-6 py-4">
                                                                        <MFTPasswordCell
                                                                            mft={item}
                                                                            onGenerate={handleGeneratePassword}
                                                                            onGenerateAndSend={handleGenerateAndSendOne}
                                                                            onSendEmail={handleSendCredentialsEmail}
                                                                            generatingFor={generatingPassword}
                                                                            sendingFor={sendingEmail}
                                                                        />
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Admin Password Modal ── */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Change Password</h3>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className={labelClass}>New Password</label>
                                <input name="newPassword" type="password" required minLength={8} className={inputClass} placeholder="Min. 8 characters" />
                            </div>
                            <div>
                                <label className={labelClass}>Confirm New Password</label>
                                <input name="confirmPassword" type="password" required minLength={8} className={inputClass} placeholder="Re-enter new password" />
                            </div>
                            <button type="submit" disabled={processing} className={buttonClass}>
                                {processing ? 'Updating…' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
