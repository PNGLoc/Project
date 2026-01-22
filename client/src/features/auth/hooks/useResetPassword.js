import { useState } from 'react';
import authApi from '../api/authApi';

export const useResetPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const resetPassword = async (data) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await authApi.resetPassword(data);
            setSuccess(response.message);
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Reset failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { resetPassword, isLoading, error, success };
};
