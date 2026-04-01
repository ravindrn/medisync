import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

const DonorPrompt = ({ onClose, onSuccess }) => {
    const { user, login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        district: ''
    });
    const [districts, setDistricts] = useState([]);

    useEffect(() => {
        fetchDistricts();
    }, []);

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                setDistricts(response.data);
            } else {
                // Fallback districts
                setDistricts([
                    'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
                    'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
                    'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
                    'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
                    'Monaragala', 'Ratnapura', 'Kegalle'
                ]);
            }
        } catch (error) {
            console.error('Failed to fetch districts:', error);
            setDistricts([
                'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
                'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
                'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
                'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
                'Monaragala', 'Ratnapura', 'Kegalle'
            ]);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                const result = await login(formData.email, formData.password);
                if (result.success) {
                    toast.success('Welcome back, Donor!');
                    onSuccess();
                } else {
                    toast.error(result.error);
                }
            } else {
                // Register as DONOR - explicitly pass role 'donor'
                console.log('📝 Registering as DONOR with data:', {
                    name: formData.name,
                    email: formData.email,
                    district: formData.district,
                    phone: formData.phone,
                    role: 'donor'
                });
                
                const result = await register({
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    district: formData.district,
                    phone: formData.phone
                }, 'donor');  // Pass 'donor' as the role
                
                if (result.success) {
                    toast.success('🎉 Registration successful! Welcome to MediSync Donor Program!');
                    onSuccess();
                } else {
                    toast.error(result.error);
                }
            }
        } catch (error) {
            console.error('Auth error:', error);
            toast.error(error.response?.data?.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '20px',
            maxWidth: '450px',
            width: '90%',
            padding: '32px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            position: 'relative'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '8px',
            textAlign: 'center'
        },
        subtitle: {
            fontSize: '14px',
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: '24px'
        },
        formGroup: {
            marginBottom: '16px'
        },
        label: {
            display: 'block',
            marginBottom: '6px',
            fontWeight: '500',
            fontSize: '13px',
            color: '#374151'
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s'
        },
        select: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            outline: 'none'
        },
        button: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '8px',
            transition: 'background-color 0.2s'
        },
        buttonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        },
        switchButton: {
            textAlign: 'center',
            marginTop: '16px',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: '14px',
            textDecoration: 'underline'
        },
        closeButton: {
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#6b7280'
        },
        heartIcon: {
            fontSize: '48px',
            textAlign: 'center',
            marginBottom: '16px'
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} style={styles.closeButton}>✕</button>
                <div style={styles.heartIcon}>❤️</div>
                <h2 style={styles.title}>
                    {isLogin ? 'Welcome Back, Hero!' : 'Join the MediSync Donor Family'}
                </h2>
                <p style={styles.subtitle}>
                    {isLogin 
                        ? 'Login to manage your donations and track your impact' 
                        : 'Your generosity can save lives. Join us in making healthcare accessible to all!'}
                </p>

                <form onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div style={styles.formGroup}>
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
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Phone Number *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    style={styles.input}
                                    placeholder="Enter your phone number"
                                    required
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>District *</label>
                                <select
                                    name="district"
                                    value={formData.district}
                                    onChange={handleChange}
                                    style={styles.select}
                                    required
                                >
                                    <option value="">Select your district</option>
                                    {districts.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Email Address *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            style={styles.input}
                            placeholder="Enter your email address"
                            required
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Password *</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
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
                        {loading ? 'Processing...' : (isLogin ? 'Login to Donor Portal' : 'Register as Donor')}
                    </button>
                </form>

                <div style={styles.switchButton} onClick={() => setIsLogin(!isLogin)}>
                    {isLogin ? "✨ New to MediSync? Register as a Donor" : "🔑 Already have an account? Login"}
                </div>
            </div>
        </div>
    );
};

export default DonorPrompt;