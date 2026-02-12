import { Link, useLocation } from 'react-router-dom';
import { FileText, Home, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
    const location = useLocation();
    const { theme, toggleTheme } = useTheme();

    return (
        <nav className="bg-purple-600 dark:bg-purple-900 shadow-xl sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
                <Link to="/" className="flex items-center gap-3 text-white text-lg sm:text-xl font-bold hover:scale-105 transition-transform">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                    </div>
                    <span className="hidden sm:inline">College Leave Portal</span>
                    <span className="sm:hidden">Leave Portal</span>
                </Link>

                <div className="flex gap-3 sm:gap-6 items-center w-full sm:w-auto justify-center">
                    <Link
                        to="/"
                        className={`flex items-center gap-2 text-white/90 font-medium px-4 py-2.5 rounded-xl transition-all hover:bg-white/20 backdrop-blur-sm text-sm sm:text-base ${location.pathname === '/' ? 'bg-white/30 shadow-lg' : ''
                            }`}
                    >
                        <Home className="w-4 h-4" />
                        <span className="hidden sm:inline">Apply</span>
                        <span className="sm:hidden">Apply</span>
                    </Link>
                    <Link
                        to="/status"
                        className={`flex items-center gap-2 text-white/90 font-medium px-4 py-2.5 rounded-xl transition-all hover:bg-white/20 backdrop-blur-sm text-sm sm:text-base ${location.pathname === '/status' ? 'bg-white/30 shadow-lg' : ''
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        <span className="hidden sm:inline">Status</span>
                        <span className="sm:hidden">Status</span>
                    </Link>

                    <button
                        onClick={toggleTheme}
                        className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm hover:scale-105 active:scale-95"
                        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
