// src/features/staff/api/staffApi.js
import axiosClient from '../../../lib/axios';

const staffApi = {
    registerStaff: async (staffData) => {
        // Backend mounts staff routes at /api/staffs and POST / creates a staff
        const response = await axiosClient.post('/api/staffs', staffData);
        return response.data;
    },

    // Sau này có thể thêm các hàm khác: getStaffs, updateStaff, deleteStaff...
};

export default staffApi;