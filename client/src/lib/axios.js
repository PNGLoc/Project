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

// Catch 401 errors globally to auto-logout
axiosClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Redirect to login if not already there to prevent infinite loops
            if (window.location.pathname !== '/login') {
                window.location.href = '/login?session_expired=true';
            }
        }
        return Promise.reject(error);
    }
);

export default axiosClient;