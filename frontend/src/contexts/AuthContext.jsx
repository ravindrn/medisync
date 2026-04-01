import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        
        console.log('=== AUTHCONTEXT INIT ===');
        console.log('Token exists:', !!token);
        console.log('Stored user:', storedUser);
        
        if (token && storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                console.log('Setting user from localStorage:', parsedUser);
                setUser(parsedUser);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (error) {
                console.error('Error parsing user data:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUser(null);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        const { token, ...userData } = response.data;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // This should trigger re-render
        setUser(userData);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
};

    const register = async (userData, role = 'patient') => {
        try {
            console.log('=== REGISTER ATTEMPT ===');
            console.log('Registering with role:', role);
            
            // Add role to the registration data
            const response = await api.post('/auth/register', {
                ...userData,
                role: role
            });
            
            const { token, ...user } = response.data;
            
            console.log('Register response user:', user);
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(user);
            
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        console.log('=== LOGOUT ===');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
        toast.success('Logged out successfully');
    };

    const updateUser = (updatedUser) => {
        console.log('=== UPDATE USER ===');
        console.log('Updated user:', updatedUser);
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const value = {
        user,
        login,
        register,
        logout,
        updateUser,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};