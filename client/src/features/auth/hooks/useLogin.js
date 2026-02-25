import { useState } from 'react';
import authApi from '../api/authApi';

export const useLogin = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const login = async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await authApi.login(credentials);
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Login failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading, error };
};
