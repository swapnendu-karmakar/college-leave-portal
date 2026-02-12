import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { mftLogin } from '../services/supabase';
import { comparePassword } from '../utils/validators';

const FacultyLogin = () => {
    const navigate = useNavigate();
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
        <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center py-12 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-10 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <h1 className="text-3xl font-bold mb-2">Faculty Login</h1>
                        <p className="text-purple-100">MFT Portal Access</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-4 m-8 mb-0 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 font-medium">
                            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-8">
                        <div className="mb-6">
                            <label htmlFor="email" className="block mb-2 font-semibold text-gray-700">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="your.email@example.com"
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
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
                                placeholder="Enter your password"
                                required
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg text-lg font-semibold transition-all hover:from-purple-700 hover:to-indigo-800 hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none mt-4"
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="px-8 pb-6 pt-4 border-t border-gray-200 flex justify-center gap-6 text-sm">
                        <Link to="/" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                            Student Portal
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link to="/admin/login" className="text-purple-600 hover:text-purple-800 font-medium transition-colors">
                            Admin Portal
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FacultyLogin;
