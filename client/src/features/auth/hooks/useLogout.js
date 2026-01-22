import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';

export const useLogout = () => {
    const navigate = useNavigate();

    const logout = () => {
        authApi.logout();
        navigate('/login');
    };

    return { logout };
};
