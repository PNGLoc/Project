import { useState } from 'react';
import authApi from '../api/authApi';

export const useVerify = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const verify = async (verificationData) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await authApi.verify(verificationData);
            setSuccess(response.message);
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Verification failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const resendOtp = async (email) => {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const response = await authApi.resendOtp({ email });
            setSuccess(response.message);
            return response;
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Resend failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    return { verify, resendOtp, isLoading, error, success };
};
