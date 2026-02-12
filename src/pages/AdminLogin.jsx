import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkAdminExists, createAdmin, adminLogin } from '../services/supabase';
import { hashPassword, comparePassword } from '../utils/validators';

const AdminLogin = () => {
    const navigate = useNavigate();
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
        return <div className="flex items-center justify-center min-h-screen text-2xl text-pink-600">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-600 text-white p-10 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <h1 className="text-3xl font-bold mb-2">{isFirstTime ? 'Admin Setup' : 'Admin Login'}</h1>
                        <p className="text-pink-100">{isFirstTime ? 'Create your admin account' : 'Portal Administration'}</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-4 m-8 mb-0 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 font-medium">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={isFirstTime ? handleSetup : handleLogin} className="p-8">
                        <div className="mb-6">
                            <label htmlFor="email" className="block mb-2 font-semibold text-gray-700">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="admin@example.com"
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                            />
                        </div>

                        <div className="mb-6">
                            <label htmlFor="password" className="block mb-2 font-semibold text-gray-700">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                            />
                        </div>

                        {isFirstTime && (
                            <div className="mb-6">
                                <label htmlFor="confirmPassword" className="block mb-2 font-semibold text-gray-700">Confirm Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm password"
                                    required
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-100"
                                />
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg text-lg font-semibold transition-all hover:from-pink-600 hover:to-rose-700 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-4"
                        >
                            {loading ? 'Processing...' : isFirstTime ? 'Create Admin Account' : 'Login'}
                        </button>
                    </form>

                    <div className="px-8 pb-6 pt-4 border-t border-gray-200 flex justify-center gap-6 text-sm">
                        <Link to="/" className="text-pink-600 hover:text-pink-800 font-medium transition-colors">
                            Student Portal
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link to="/faculty/login" className="text-pink-600 hover:text-pink-800 font-medium transition-colors">
                            Faculty Portal
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
