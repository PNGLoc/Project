import { Routes, Route } from 'react-router-dom';
import React from 'react';
import HomePage from '../pages/HomePage';
import VerifyEmail from '../pages/auth/VerifyEmail';
import Register from '../pages/auth/Register';
import ResetPassword from '../pages/auth/ResetPassword';
import ForgotPassword from '../pages/auth/ForgotPassword';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/AdminDashboard';
import SalonDashboard from '../pages/salon/SalonDashboard';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import HeaderHome from "../components/layout/HeaderHome";
import SalonRegistration from '../pages/salon/SalonRegistration';
import ServiceManagement from '../pages/salon/ServiceManagement';

const AppRoutes = () => {
    return (
        <Routes>
            {/* --- NHÓM PUBLIC --- */}
            <Route path="/" element={<HomePage />} />

            {/* MENU */}
            <Route path="/search" element={<HeaderHome />} />
            <Route path="/lookbook" element={<HeaderHome />} />
            <Route path="/ai-analysis" element={<HeaderHome />} />
            <Route path="/category/:type" element={<HeaderHome />} />

            {/* --- AUTH ROUTES --- */}
            <Route path='/login' element={<Login />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/register' element={<Register />} />
            <Route path='/verify-email' element={<VerifyEmail />} />

            {/* --- NHÓM PROTECTED (Phân quyền) --- */}

            {/* Role: CUSTOMER */}
            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                <Route path='/users/profile' element={<h2>User Profile (Placeholder)</h2>} />
                <Route path="/salon/register" element={<SalonRegistration />} />

            </Route>

            {/* Role: SALON_OWNER */}
            <Route element={<ProtectedRoute allowedRoles={['SALON_OWNER']} />}>
                <Route path="/salon" element={<SalonDashboard />}>
                    <Route path="dashboard" element={<SalonDashboard />} />
                </Route>
            </Route>

            {/* Role: ADMIN */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path='/admin/dashboard' element={<AdminDashboard />} />
                <Route path='/admin/users' element={<h2>Manage Users (Placeholder)</h2>} />
            </Route>

            {/* 404 - NOT FOUND */}
            <Route path="*" element={<div>404 - Không tìm thấy trang</div>} />
        </Routes>
    );
};

export default AppRoutes;