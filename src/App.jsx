import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import StudentApplication from './pages/StudentApplication';
import ApplicationSuccess from './pages/ApplicationSuccess';
import StudentStatus from './pages/StudentStatus';
import FacultyLogin from './pages/FacultyLogin';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function AppContent() {
  const location = useLocation();
  const showNavbar = !location.pathname.startsWith('/faculty') && !location.pathname.startsWith('/admin');

  return (
    <div className="App">
      {showNavbar && <Navbar />}
      <Routes>
        {/* Student Routes */}
        <Route path="/" element={<StudentApplication />} />
        <Route path="/success/:applicationId" element={<ApplicationSuccess />} />
        <Route path="/status" element={<StudentStatus />} />

        {/* Faculty Routes */}
        <Route path="/faculty/login" element={<FacultyLogin />} />
        <Route path="/faculty/dashboard" element={<FacultyDashboard />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    </div>
  );
}

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
