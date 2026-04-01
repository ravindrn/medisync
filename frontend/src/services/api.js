import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL; // Vite env variable

console.log('📡 API URL:', API_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});

// Add interceptors as before
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
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ERR_NETWORK') {
            console.error('❌ Network Error: Cannot connect to backend server');
        } else if (error.response) {
            console.error(`❌ API Error: ${error.response.status} - ${error.response.data?.message || error.message}`);
        }
        return Promise.reject(error);
    }
);

export default api;
