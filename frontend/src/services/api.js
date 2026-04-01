import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL}/api`;

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
            console.error('❌ Network Error: Cannot connect to backend server');
            console.error('   Make sure backend is running on http://localhost:5000');
        } else if (error.response) {
            console.error(`❌ API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
            
            // If unauthorized, clear local storage and redirect to login
            if (error.response.status === 401) {
                console.log('🔒 Unauthorized - Clearing session and redirecting to login');
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // Only redirect if not already on login page
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
