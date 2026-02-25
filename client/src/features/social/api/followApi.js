import axiosClient from '../../../lib/axios';

const followApi = {
  getStatus: async (targetType, targetId) => {
    const response = await axiosClient.get('/api/follows/status', {
      params: { targetType, targetId },
    });
    return response.data;
  },
  follow: async (targetType, targetId) => {
    const response = await axiosClient.post('/api/follows', {
      targetType,
      targetId,
    });
    return response.data;
  },
  unfollow: async (targetType, targetId) => {
    const response = await axiosClient.delete('/api/follows', {
      data: { targetType, targetId },
    });
    return response.data;
  },
  getMySalons: async () => {
    const response = await axiosClient.get('/api/follows/my-salons');
    return response.data;
  },
  getMyStaffs: async () => {
    const response = await axiosClient.get('/api/follows/my-staffs');
    return response.data;
  },
  getFollowers: async () => {
    const response = await axiosClient.get('/api/follows/followers');
    return response.data;
  },
};

export default followApi;


