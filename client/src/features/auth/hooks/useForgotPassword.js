import { useState } from 'react';
import authApi from '../api/authApi';

export const useForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const forgotPassword = async (email) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await authApi.forgotPassword(email);
            setSuccess(response.message);
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Something went wrong';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { forgotPassword, isLoading, error, success };
};
