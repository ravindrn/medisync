import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import HomePage from './components/HomePage';
import Register from './components/Auth/Register';
import Profile from './components/Profile/Profile';
import './index.css';
import ManagerDashboard from './components/Manager/ManagerDashboard';
import AdminDashboard from './components/Admin/AdminDashboard';
import MedicineManagement from './components/Admin/MedicineManagement';
import MinistryDashboard from './components/Ministry/MinistryDashboard';
import DonorDashboard from './components/Donor/DonorDashboard';
import NurseDashboard from './components/Nurse/NurseDashboard';

// Login Component
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

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '80vh',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    },
    formContainer: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      width: '100%',
      maxWidth: '400px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      marginBottom: '10px',
      textAlign: 'center',
      color: '#1e293b'
    },
    subtitle: {
      textAlign: 'center',
      color: '#64748b',
      marginBottom: '30px',
      fontSize: '14px'
    },
    inputGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '500',
      color: '#475569',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '16px'
    },
    button: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginTop: '10px'
    },
    buttonDisabled: {
      backgroundColor: '#9ca3af',
      cursor: 'not-allowed'
    },
    link: {
      textAlign: 'center',
      marginTop: '20px',
      color: '#3b82f6',
      textDecoration: 'none',
      display: 'block'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.formContainer}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Login to your MediSync account</p>
        
        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter your password"
              required
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              ...(loading ? styles.buttonDisabled : {})
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <Link to="/register" style={styles.link}>
          Don't have an account? Create one
        </Link>
      </div>
    </div>
  );
}

// Navbar Component
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const styles = {
    nav: {
      backgroundColor: '#3b82f6',
      padding: '15px 20px',
      color: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '15px'
    },
    logo: {
      color: 'white',
      textDecoration: 'none',
      fontSize: '24px',
      fontWeight: 'bold'
    },
    links: {
      display: 'flex',
      gap: '20px',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    link: {
      color: 'white',
      textDecoration: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.3s'
    },
    adminLink: {
      backgroundColor: '#ef4444',
      color: 'white',
      textDecoration: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.3s',
      fontWeight: 'bold'
    },
    donorLink: {
      backgroundColor: '#10b981',
      color: 'white',
      textDecoration: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.3s',
      fontWeight: 'bold'
    },
    nurseLink: {
      backgroundColor: '#14b8a6',
      color: 'white',
      textDecoration: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.3s',
      fontWeight: 'bold'
    },
    userInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flexWrap: 'wrap'
    },
    districtBadge: {
      backgroundColor: '#1e40af',
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '5px'
    },
    logoutButton: {
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      padding: '8px 16px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'background-color 0.3s'
    }
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.container}>
        <Link to="/" style={styles.logo}>
          🏥 MediSync
        </Link>
        <div style={styles.links}>
          {user ? (
            <div style={styles.userInfo}>
              <span>Welcome, {user.name}</span>
              <span style={styles.districtBadge}>
                📍 {user.district}
              </span>
              
              {/* Profile Link */}
              <Link to="/profile" style={styles.link}>
                👤 Profile
              </Link>
              
              {/* Donor Link - Show for donor role */}
              {user.role === 'donor' && (
                <Link to="/donor" style={styles.donorLink}>
                  ❤️ Donor Dashboard
                </Link>
              )}
              
              {/* Nurse Link - Show for nurse role */}
              {user.role === 'nurse' && (
                <Link to="/nurse" style={styles.nurseLink}>
                  🩺 Nurse Dashboard
                </Link>
              )}
              
              {/* Admin Links - Only visible to admin users */}
              {user.role === 'admin' && (
                <>
                  <Link to="/admin" style={styles.adminLink}>
                    👑 Admin Dashboard
                  </Link>
                  <Link to="/admin/medicines" style={styles.adminLink}>
                    📦 Manage Medicines
                  </Link>
                </>
              )}

              {user.role === 'manager' && (
                <Link to="/manager" style={styles.link}>
                  🏥 Hospital Dashboard
                </Link>
              )}

              {user.role === 'ministry_officer' && (
                <Link to="/ministry" style={styles.link}>
                  🏛️ Ministry Dashboard
                </Link>
              )} 
              
              <button onClick={handleLogout} style={styles.logoutButton}>
                Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" style={styles.link}>Login</Link>
              <Link to="/register" style={styles.link}>Register</Link>
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
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;