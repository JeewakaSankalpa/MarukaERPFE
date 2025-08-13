// src/api/api.js  (your file; you can keep the name you used)
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta?.env?.VITE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:8080/api',
    timeout: 20000,
});

// Attach JWT if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Optionally unwrap {data} and auto-handle 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            // e.g., redirect to login or clear token
            // localStorage.removeItem('token');
            // window.location.assign('/login');
        }
        return Promise.reject(err);
    }
);

export default api;
