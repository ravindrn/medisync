import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import Register from './components/Auth/Register';
import Profile from './components/Profile/Profile';
import './index.css';
import './styles/medisync.css'; // Import modern CSS
import ManagerDashboard from './components/Manager/ManagerDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import MedicineManagement from './components/Admin/MedicineManagement';
import MinistryDashboard from './components/Ministry/MinistryDashboard';
import DonorDashboard from './components/Donor/DonorDashboard';
import NurseDashboard from './components/Nurse/NurseDashboard';

// Login Component - Modernized
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Login successful!');
      navigate('/');
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="medisync-card" style={{ maxWidth: '450px', width: '100%' }}>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center', color: '#1a1a2e' }}>
          Welcome Back
        </h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px', fontSize: '14px' }}>
          Login to your MediSync account
        </p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="modern-input"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="modern-input"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <Link to="/register" style={{ textAlign: 'center', marginTop: '20px', color: '#2A9CC1', textDecoration: 'none', display: 'block' }}>
          Don't have an account? Create one
        </Link>
      </div>
    </div>
  );
}

// Navbar Component - Modernized
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <Link to="/" className="nav-brand" style={{ fontSize: '24px', fontWeight: 'bold', textDecoration: 'none' }}>
          🏥 MediSync
        </Link>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
          {user ? (
            <>
              <span style={{ color: '#1a1a2e', fontWeight: '500' }}>Welcome, {user.name}</span>
              
              <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                📍 {user.district}
              </span>
              
              {/* Profile Link */}
              <Link to="/profile" className="nav-link">
                👤 Profile
              </Link>
              
              {/* Donor Link - Show for donor role */}
              {user.role === 'donor' && (
                <Link to="/donor" className="btn-primary" style={{ padding: '8px 20px', textDecoration: 'none' }}>
                  ❤️ Donor Dashboard
                </Link>
              )}
              
              {/* Nurse Link - Show for nurse role */}
              {user.role === 'nurse' && (
                <Link to="/nurse" className="btn-primary" style={{ padding: '8px 20px', textDecoration: 'none', background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' }}>
                  🩺 Nurse Dashboard
                </Link>
              )}
              
              {/* Admin Links - Only visible to admin users */}
              {user.role === 'admin' && (
                <>
                  <Link to="/admin" className="btn-primary" style={{ padding: '8px 20px', textDecoration: 'none', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                    👑 Admin Dashboard
                  </Link>
                  <Link to="/admin/medicines" className="btn-secondary" style={{ padding: '8px 20px', textDecoration: 'none' }}>
                    📦 Manage Medicines
                  </Link>
                </>
              )}

              {user.role === 'manager' && (
                <Link to="/manager" className="nav-link">
                  🏥 Hospital Dashboard
                </Link>
              )}

              {user.role === 'ministry_officer' && (
                <Link to="/ministry" className="nav-link">
                  🏛️ Ministry Dashboard
                </Link>
              )} 
              
              <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 20px' }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn-primary" style={{ textDecoration: 'none' }}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/medicines" element={<MedicineManagement />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/ministry" element={<MinistryDashboard />} />
          <Route path="/donor" element={<DonorDashboard />} />
          <Route path="/donor/*" element={<DonorDashboard />} />
          <Route path="/nurse" element={<NurseDashboard />} />
        </Routes>
        <Toaster position="top-right" toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#fff',
            color: '#1a1a2e',
            boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
          },
          success: {
            iconTheme: {
              primary: '#2A9CC1',
              secondary: '#fff',
            },
          },
        }} />
      </AuthProvider>
    </Router>
  );
}

export default App;
