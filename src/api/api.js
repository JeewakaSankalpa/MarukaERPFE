// src/api/api.js
import axios from 'axios';

// ---- Base URL (CRA-safe) ----
// Priority: REACT_APP_API_URL env -> window.__API_URL__ -> localhost fallback
const baseURL =
    process.env.REACT_APP_API_URL ||
    (typeof window !== 'undefined' && window.__API_URL__) ||
    'http://localhost:8080/api';

const api = axios.create({
    baseURL,
    timeout: 90000, // 90s — backend can be slow due to GCS file validation + notification events
});

// ---- Array param handling: status=A&status=B (no [] brackets) ----
api.defaults.paramsSerializer = (params) => {
    const usp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
        if (Array.isArray(v)) {
            v.forEach((val) => usp.append(k, String(val)));
        } else if (v !== undefined && v !== null) {
            usp.append(k, String(v));
        }
    });
    return usp.toString();
};

// ---- Attach JWT and Username if present ----
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const username = localStorage.getItem('username');
    if (username) config.headers['X-User'] = username;

    return config;
});

// ---- Optional 401 handling ----
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err?.response?.status === 401) {
            // Example:
            // localStorage.removeItem('token');
            // window.location.assign('/login');
        }
        return Promise.reject(err);
    }
);

export default api;
