import { useState } from 'react';
import authApi from '../api/authApi';

export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const register = async (userData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await authApi.register(userData);
            setSuccess(response.message);
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Registration failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { register, isLoading, error, success };
};
