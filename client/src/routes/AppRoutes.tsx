import { Routes, Route } from 'react-router-dom';

import HomePage from '../pages/HomePage';
import VerifyEmail from '../pages/auth/VerifyEmail';
import Register from '../pages/auth/Register';
import ResetPassword from '../pages/auth/ResetPassword';
import ForgotPassword from '../pages/auth/ForgotPassword';
import Login from '../pages/auth/Login';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import AdminDashboard from '../pages/admin/AdminDashboard';
import SalonDashboard from '../pages/salon/SalonDashboard';



const AppRoutes = () => {
    return (
        <Routes>
            {/* --- NHÓM PUBLIC  --- */}
            {/* Chèn tương tự như HomePage */}
            <Route path="/" element={<HomePage />} />


            <Route path="/search" />

            <Route path="/lookbook" />
            <Route path="/ai-analysis" />

            <Route path="/category/:type" />

            <Route path="*" element={<div>404 - Không tìm thấy trang</div>} />

            <Route path='/login' element={<Login />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/register' element={<Register />} />
            <Route path='/verify-email' element={<VerifyEmail />} />

            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                <Route path='/users/profile' element={<h2>User Profile (Placeholder)</h2>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['SALON_OWNER']} />}>
                <Route path='/salon/dashboard' element={<SalonDashboard />} />
                <Route path='/salon/manage' element={<h2>Manage Salon (Placeholder)</h2>} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path='/admin/dashboard' element={<AdminDashboard />} />
                <Route path='/admin/users' element={<h2>Manage Users (Placeholder)</h2>} />
            </Route>
        </Routes >
    );
};

export default AppRoutes;