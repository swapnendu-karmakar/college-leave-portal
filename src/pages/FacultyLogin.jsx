import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react';
import { mftLogin } from '../services/supabase';
import { comparePassword } from '../utils/validators';
import { useTheme } from '../context/ThemeContext';

const FacultyLogin = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.email || !formData.password) {
            setError('Please enter both email and password');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const mft = await mftLogin(formData.email);
            const isValid = await comparePassword(formData.password, mft.password_hash);

            if (!isValid) {
                setError('Invalid email or password');
                setLoading(false);
                return;
            }

            sessionStorage.setItem('mft', JSON.stringify({
                id: mft.id,
                name: mft.name,
                email: mft.email,
            }));

            navigate('/faculty/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 transition-colors duration-300">
            <div className="w-full max-w-md">
                {/* Card Container */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">

                    {/* Header */}
                    <div className="bg-emerald-600 dark:bg-emerald-900 text-white p-8 sm:p-10 text-center relative overflow-hidden">

                        {/* Theme Toggle - Absolute Top Right */}
                        <div className="absolute top-4 right-4 z-20">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
                                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            >
                                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-inner">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-bold mb-2 tracking-tight">Faculty Login</h1>
                            <p className="text-emerald-100 font-medium">Secure MFT Portal Access</p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mx-8 mt-8 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl border-l-4 border-red-500 font-medium animate-shake shadow-sm">
                            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="email" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                <Mail className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="your.email@example.com"
                                required
                                className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-700"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300 text-sm">
                                <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base transition-all focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 dark:focus:ring-emerald-900/30 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white hover:border-emerald-300 dark:hover:border-emerald-700"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl text-lg font-bold transition-all hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer Links */}
                    <div className="px-8 pb-8 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-center items-center gap-4 text-sm font-medium">
                        <Link to="/" className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors">
                            <ArrowRight className="w-4 h-4 rotate-180" />
                            Student Portal
                        </Link>
                        <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
                        <Link to="/admin/login" className="flex items-center gap-1 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors">
                            Admin Access
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyLogin;
