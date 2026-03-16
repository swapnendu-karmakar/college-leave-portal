import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, AlertCircle, CheckCircle2, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { setupMFTPassword } from '../services/supabase';
import { hashPassword } from '../utils/validators';

const MFTSetup = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const query = new URLSearchParams(location.search);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const emailParam = query.get('email');
        if (emailParam) {
            setEmail(emailParam);
        } else {
            setError('Invalid or expired setup link. Please request a new invite from the administrator.');
        }
    }, [location.search]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            const hashed = await hashPassword(password);
            const { error: setupError } = await setupMFTPassword(email, hashed);
            
            if (setupError) throw setupError;
            
            setSuccess(true);
            setTimeout(() => {
                // Assuming MFTs use the faculty login page
                navigate('/faculty/login');
            }, 3000);
            
        } catch (err) {
            console.error('MFT setup error:', err);
            setError(err.message || 'Failed to finish account setup. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 dark:focus:ring-rose-500/20 dark:focus:border-rose-500 outline-none transition-all text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500";
    const labelClass = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center animate-fadeIn">
                        <KeyRound className="w-8 h-8 text-rose-500" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                    Setup your Account
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                    Welcome! Please complete your MFT profile by choosing a secure password.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-slideUp">
                <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-3xl sm:px-10 border border-gray-100 dark:border-gray-700 transition-colors">
                    {success ? (
                        <div className="text-center py-6 animate-fadeIn">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Account Ready!</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6">
                                Your password has been successfully set. You can now use it to log in.
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Redirecting to login...
                            </p>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleSubmit}>
                            {error && (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-3 border-l-4 border-red-500 font-medium animate-shake">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>Email Address</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        readOnly
                                        value={email}
                                        className={`${inputClass} pl-11 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed`}
                                        placeholder="loading..."
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    This is your pre-registered email address.
                                </p>
                            </div>

                            <div>
                                <label className={labelClass}>New Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        disabled={!email}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`${inputClass} pl-11`}
                                        placeholder="Min. 8 characters"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Confirm Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="password"
                                        required
                                        disabled={!email}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`${inputClass} pl-11`}
                                        placeholder="Re-enter password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                                        Setting up...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Finish Setup
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MFTSetup;
