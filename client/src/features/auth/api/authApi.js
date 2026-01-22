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
            localStorage.setItem('user', JSON.stringify(response.data));
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
    },
};

export default authApi;
