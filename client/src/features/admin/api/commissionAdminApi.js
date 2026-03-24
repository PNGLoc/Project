import axiosClient from '../../../lib/axios';

const commissionAdminApi = {
    getConfig: async () => {
        const response = await axiosClient.get('/api/admin/commission-config');
        return response.data;
    },

    updateConfig: async (commissionPercent) => {
        const response = await axiosClient.put('/api/admin/commission-config', {
            commissionPercent
        });
        return response.data;
    },

    getHistory: async (params = {}) => {
        const response = await axiosClient.get('/api/admin/commission-history', { params });
        return response.data;
    },

    getTransactions: async (params = {}) => {
        const response = await axiosClient.get('/api/admin/commission-transactions', { params });
        return response.data;
    }
};

export default commissionAdminApi;
