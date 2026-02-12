import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkAdminExists, createAdmin, adminLogin } from '../services/supabase';
import { hashPassword, comparePassword } from '../utils/validators';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, ShieldCheck, Mail, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        checkFirstTimeSetup();
    }, []);

    const checkFirstTimeSetup = async () => {
        try {
            const adminExists = await checkAdminExists();
            setIsFirstTime(!adminExists);
        } catch (err) {
            console.error('Error checking admin:', err);
            setError('Failed to check admin status');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSetup = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        try {
            setLoading(true);
            const passwordHash = await hashPassword(formData.password);

            const admin = await createAdmin({
                email: formData.email,
                password_hash: passwordHash,
            });

            sessionStorage.setItem('admin', JSON.stringify({
                id: admin.id,
                email: admin.email,
            }));

            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Setup error:', err);
            setError('Failed to create admin account');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setError('Please enter both email and password');
            return;
        }

        try {
            setLoading(true);
            const admin = await adminLogin(formData.email);
            const isValid = await comparePassword(formData.password, admin.password_hash);

            if (!isValid) {
                setError('Invalid email or password');
                setLoading(false);
                return;
            }

            sessionStorage.setItem('admin', JSON.stringify({
                id: admin.id,
                email: admin.email,
            }));

            navigate('/admin/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !isFirstTime) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-rose-50 dark:bg-gray-900 transition-colors duration-300">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-300 font-medium">Checking System Status...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-rose-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Theme Toggle - Positioned absolutely or in a clear spot */}


                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                    <div className="bg-rose-600 dark:bg-rose-900 text-white p-8 sm:p-10 text-center relative overflow-hidden">
                        {/* Theme Toggle - Absolute Top Right */}
                        <div className="absolute top-4 right-4 z-20">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                        </div>

                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-black/10 rounded-full blur-xl"></div>

                        <div className="relative z-10 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-inner">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold mb-2 tracking-tight">{isFirstTime ? 'Admin Setup' : 'Admin Portal'}</h1>
                            <p className="text-rose-100 font-medium">{isFirstTime ? 'Secure System Initialization' : 'System Administration Access'}</p>
                        </div>
                    </div>

                    <div className="p-8 sm:p-10">
                        {error && (
                            <div className="flex items-center gap-3 p-4 mb-6 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-xl border-l-4 border-red-500 font-medium">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={isFirstTime ? handleSetup : handleLogin} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1">Email Address</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="admin@example.com"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1">Password</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 font-medium"
                                    />
                                </div>
                            </div>

                            {isFirstTime && (
                                <div>
                                    <label htmlFor="confirmPassword" className="block mb-2 font-semibold text-gray-700 dark:text-gray-300 ml-1">Confirm Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <CheckCircle2 className="h-5 w-5 text-gray-400 group-focus-within:text-rose-500 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                            required
                                            className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 transition-all focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100 dark:focus:ring-rose-900/30 font-medium"
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {isFirstTime ? 'Create Admin Account' : 'Login to Dashboard'}
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    <div className="px-8 py-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-6 text-sm">
                        <Link to="/" className="text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors">
                            Student Portal
                        </Link>
                        <span className="text-gray-300 dark:text-gray-600">|</span>
                        <Link to="/faculty/login" className="text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors">
                            Faculty Portal
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
