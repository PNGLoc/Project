import axiosClient from '../../../lib/axios';

const authApi = {
    register: async (userData) => {
        const response = await axiosClient.post('/api/auth/register', userData);
        return response.data;
    },
    verify: async (verificationData) => {
        const response = await axiosClient.post('/api/auth/verify-email', verificationData);
        return response.data;
    },
    login: async (credentials) => {
        const response = await axiosClient.post('/api/auth/login', credentials);
        if (response.data) {
            // Persist token separately for axios interceptor
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }

            // Persist user profile (without relying on token being inside)
            const { token, ...user } = response.data;
            localStorage.setItem('user', JSON.stringify(user));
        }
        return response.data;
    },
    forgotPassword: async (email) => {
        const response = await axiosClient.post('/api/auth/forgot-password', { email });
        return response.data;
    },
    resetPassword: async (data) => {
        const response = await axiosClient.post('/api/auth/reset-password', data);
        return response.data;
    },
    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    },
};

export default authApi;
