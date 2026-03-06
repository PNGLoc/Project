import axiosClient from '../../../lib/axios';

const userCouponApi = {
  collectCoupon: async (couponId) => {
    const response = await axiosClient.post(`/api/user-coupons/collect/${couponId}`);
    return response.data;
  },
  getMyCollectedCoupons: async () => {
    const response = await axiosClient.get('/api/user-coupons');
    return response.data;
  },
  discardCollectedCoupon: async (collectedId) => {
    const response = await axiosClient.delete(`/api/user-coupons/${collectedId}`);
    return response.data;
  },
};

export default userCouponApi;
