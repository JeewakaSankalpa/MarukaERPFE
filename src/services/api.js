// api.js (Setup Axios instance)
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api'
});

// Attach JWT token to requests if available
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
