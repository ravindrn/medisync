import axios from 'axios';

// Detect environment and use the right backend URL
const API_URL = import.meta.env.VITE_API_URL || 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://YOUR-RENDER-BACKEND.onrender.com/api');  // ← replace this

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Request interceptor - Add token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url} - Token present`);
        } else {
            console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url} - No token`);
        }
        return config;
    },
    (error) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        console.log(`📥 API Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            console.error(`❌ Network Error: Cannot connect to backend server at ${API_URL}`);
        } else if (error.response) {
            console.error(`❌ API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
            
            if (error.response.status === 401) {
                console.log('🔒 Unauthorized - Clearing session and redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (!window.location.pathname.includes('/login')) {
                    window.location.href = '/login';
                }
            }
        } else {
            console.error('❌ API Error:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;