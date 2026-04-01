import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        district: ''
    });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    // All 24 districts of Sri Lanka
    const sriLankaDistricts = [
        'Colombo', 'Gampaha', 'Kalutara', 
        'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 
        'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu',
        'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 
        'Anuradhapura', 'Polonnaruwa',
        'Badulla', 'Monaragala', 
        'Ratnapura', 'Kegalle'
    ];

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        
        if (formData.password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        
        setLoading(true);
        
        const { confirmPassword, ...registerData } = formData;
        const result = await register(registerData);
        
        if (result.success) {
            toast.success('Registration successful! Welcome to MediSync!');
            navigate('/');
        } else {
            toast.error(result.error || 'Registration failed. Please try again.');
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
            maxWidth: '500px'
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
            fontSize: '16px',
            transition: 'border-color 0.3s'
        },
        select: {
            width: '100%',
            padding: '12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '16px',
            backgroundColor: 'white',
            cursor: 'pointer'
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
            marginTop: '10px',
            transition: 'background-color 0.3s'
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
        },
        hint: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '5px'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h2 style={styles.title}>Create Account</h2>
                <p style={styles.subtitle}>Join MediSync to track medicine availability</p>
                
                <form onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Full Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Enter your full name"
                            required
                        />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>District *</label>
                        <select
                            name="district"
                            value={formData.district}
                            onChange={handleChange}
                            style={styles.select}
                            required
                        >
                            <option value="">Select your district</option>
                            {sriLankaDistricts.map(district => (
                                <option key={district} value={district}>{district}</option>
                            ))}
                        </select>
                        <div style={styles.hint}>
                            You'll see medicine availability only in your district
                        </div>
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Password *</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Minimum 6 characters"
                            required
                        />
                    </div>
                    
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Confirm Password *</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Re-enter your password"
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
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>
                </form>
                
                <Link to="/login" style={styles.link}>
                    Already have an account? Login here
                </Link>
            </div>
        </div>
    );
};

export default Register;