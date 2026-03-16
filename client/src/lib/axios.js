import axios from 'axios';

const axiosClient = axios.create({
    baseURL: 'http://localhost:5000', // Trỏ về Server của bạn
});

// Add token to requests automatically
axiosClient.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem('token') ||
            (() => {
                try {
                    const u = JSON.parse(localStorage.getItem('user') || 'null');
                    return u?.token;
                } catch {
                    return null;
                }
            })();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

import { logout } from './authUtils';

// ... (request interceptor remains similar)

// Catch 401 errors globally to auto-logout
axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            logout();
        }
        return Promise.reject(error);
    }
);

export default axiosClient;