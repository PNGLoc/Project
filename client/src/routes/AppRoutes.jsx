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
import BlogDetail from '../pages/blog/BlogDetail';
import PostForm from '../pages/blog/PostForm';
import BlogManagement from '../pages/blog/BlogManagement';
import StaffRegistration from '../pages/salon/StaffRegistration';

// --- IMPORT ĐÃ ĐƯỢC GỘP TỪ 2 NHÁNH & THÊM MỚI ---
import ProfilePage from '../pages/users/ProfilePage';
import StaffList from "../pages/salon/StaffList";

import MainLayout from '../components/layout/MainLayout';

const AppRoutes = () => {
    return (
        <Routes>
            {/* NHÓM SỬ DỤNG HEADER CHUNG */}
            <Route element={<MainLayout />}>
                {/* --- NHÓM PUBLIC --- */}
                <Route path="/" element={<HomePage />} />
                <Route path="/blog/:id" element={<BlogDetail />} />
                {/* <Route path="/salons" element={<AllSalons />} /> */}

                {/* MENU */}
                <Route path="/search" element={<div>All Salons </div>} />
                <Route path="/lookbook" element={<div>Lookbook Page (</div>} />
                <Route path="/ai-analysis" element={<div>AI Analysis Page </div>} />
                <Route path="/category/:type" element={<div>Category Page </div>} />

                {/* --- NHÓM PROTECTED (Phân quyền) --- */}

                {/* Role: ALL AUTHENTICATED */}
                <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'SALON_OWNER', 'STAFF', 'ADMIN']} />}>
                    <Route path='/users/profile' element={<ProfilePage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    {/* Blog Management */}
                    <Route path='/blog/my-blogs' element={<BlogManagement />} />
                    <Route path='/blog/create' element={<PostForm />} />
                    <Route path='/blog/:id/edit' element={<PostForm />} />
                </Route>

                {/* Role: CUSTOMER */}
                <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                    <Route path="/salon/register" element={<SalonRegistration />} />
                </Route>
                {/* Role: SALON_OWNER */}
                <Route element={<ProtectedRoute allowedRoles={['SALON_OWNER']} />}>
                    <Route path="/salon" element={<SalonDashboard />}>
                        <Route path="staff/add" element={<StaffRegistration />} />
                        <Route path="dashboard" element={<SalonDashboard />} />
                    </Route>
                </Route>
            </Route>

            {/* --- AUTH ROUTES (Không dùng Header chung) --- */}
            <Route path='/login' element={<Login />} />
            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password' element={<ResetPassword />} />
            <Route path='/register' element={<Register />} />
            <Route path='/verify-email' element={<VerifyEmail />} />



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