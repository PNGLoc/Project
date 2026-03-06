import axiosClient from '../../../lib/axios';

const couponApi = {
  getCoupons: async (params = {}) => {
    const response = await axiosClient.get('/api/coupons', { params });
    return response.data;
  },
  getSalonCoupons: async (salonId, params = {}) => {
    const response = await axiosClient.get(`/api/salons/${salonId}/coupons`, { params });
    return response.data;
  },
  getCouponById: async (id) => {
    const response = await axiosClient.get(`/api/coupons/${id}`);
    return response.data;
  },
  createCoupon: async (data) => {
    const response = await axiosClient.post('/api/coupons', data);
    return response.data;
  },
  updateCoupon: async (id, data) => {
    const response = await axiosClient.put(`/api/coupons/${id}`, data);
    return response.data;
  },
  deleteCoupon: async (id) => {
    const response = await axiosClient.delete(`/api/coupons/${id}`);
    return response.data;
  },
};

export default couponApi;

