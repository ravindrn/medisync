import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
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
            backgroundColor: '#f5f5f5'
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
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            textAlign: 'center',
            color: '#1e293b'
        },
        inputGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#475569'
        },
        input: {
            width: '100%',
            padding: '10px',
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
            cursor: 'pointer'
        },
        link: {
            textAlign: 'center',
            marginTop: '20px',
            color: '#3b82f6',
            textDecoration: 'none'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h2 style={styles.title}>Login to MediSync</h2>
                <form onSubmit={handleSubmit}>
                    <div style={styles.inputGroup}>
                        <label style={styles.label}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={styles.input}
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
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} style={styles.button}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <div style={styles.link}>
                    Don't have an account? <Link to="/register">Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;