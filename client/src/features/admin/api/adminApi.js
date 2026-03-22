import axiosClient from '../../../lib/axios';

const adminApi = {
    getAuditLogs: async (params = {}) => {
        const response = await axiosClient.get('/api/admin/audit-logs', { params });
        return response.data;
    }
};

export default adminApi;
