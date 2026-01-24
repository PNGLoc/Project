// src/features/staff/hooks/useRegisterStaff.js
import { useState } from 'react';
import staffApi from '../api/staffApi';

export const useRegisterStaff = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const registerStaff = async (staffData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await staffApi.registerStaff(staffData);
            setSuccess(response.message || 'Thêm/cập nhật nhân viên thành công');
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Thêm nhân viên thất bại';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { registerStaff, isLoading, error, success };
};