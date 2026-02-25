import axiosClient from '../../../lib/axios';

const userAdminApi = {
  getUsers: async (params = {}) => {
    const response = await axiosClient.get('/api/users', { params });
    return response.data;
  },
  getUserById: async (id) => {
    const response = await axiosClient.get(`/api/users/${id}`);
    return response.data;
  },
  toggleUserActive: async (id) => {
    const response = await axiosClient.delete(`/api/users/${id}`);
    return response.data;
  },
};

export default userAdminApi;


