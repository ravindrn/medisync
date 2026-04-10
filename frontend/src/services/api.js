import axios from 'axios';

// Vite environment variable (must start with VITE_)
const API_URL = import.meta.env.VITE_API_URL; // Example: https://medisync-dlje.onrender.com/api

console.log('📡 API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL, // make sure this ends with /api in your .env
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - adds token automatically
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

// Response interceptor - logs errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('❌ Network Error: Cannot connect to backend server');
    } else if (error.response) {
      console.error(
        `❌ API Error: ${error.response.status} - ${error.response.data?.message || error.message}`
      );

      // Handle unauthorized
      if (error.response.status === 401) {
        console.log('🔒 Unauthorized - clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
