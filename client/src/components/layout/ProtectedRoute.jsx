import { Navigate, Outlet } from 'react-router-dom';
import { isTokenExpired, logout } from '../../lib/authUtils';

const ProtectedRoute = ({ allowedRoles }) => {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const token = localStorage.getItem('token') || user?.token;

    if (!user || (token && isTokenExpired(token))) {
        if (user || token) logout(); // Only call logout if there was a session attempting to be active
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to home if role not authorized (or can normally go to a 403 page)
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
