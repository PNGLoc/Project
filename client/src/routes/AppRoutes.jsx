import { Routes, Route } from 'react-router-dom';
import React from 'react';
import HomePage from '../pages/HomePage';
import VerifyEmail from '../pages/auth/VerifyEmail';
import Register from '../pages/auth/Register';
import ResetPassword from '../pages/auth/ResetPassword';
import ForgotPassword from '../pages/auth/ForgotPassword';
import Login from '../pages/auth/Login';
import AdminDashboard from '../pages/admin/AdminDashboard';
import AdminMyPosts from '../pages/admin/AdminMyPosts';
import AdminUsers from '../pages/admin/AdminUsers';
import AdminReports from '../pages/admin/AdminReports';
import AdminCommissionConfig from '../pages/admin/AdminCommissionConfig';
import SalonDashboard from '../pages/salon/SalonDashboard';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import HeaderHome from "../components/layout/HeaderHome";
import SalonRegistration from '../pages/salon/SalonRegistration';
import SalonDetail from '../pages/salon/SalonDetail';
import StaffDetail from '../pages/staff/StaffDetail';
import PostDetail from '../pages/post/PostDetail';
import LookbookDetail from '../pages/post/LookbookDetail';
import PostForm from '../pages/post/PostForm';
import PostManagement from '../pages/post/PostManagement';
import StaffRegistration from '../pages/salon/StaffRegistration';
import LookbookPage from '../pages/LookbookPage';
import SearchPage from '../pages/SearchPage';

// --- IMPORT ĐÃ ĐƯỢC GỘP TỪ 2 NHÁNH & THÊM MỚI ---
import ProfilePage from '../pages/users/ProfilePage';
import StaffList from "../pages/salon/StaffList";
import StaffDashboard from '../pages/staff/StaffDashboard';
import BookAppointment from '../pages/booking/BookAppointment';
import CustomerBookingHistory from '../pages/booking/CustomerBookingHistory';
import SalonCalendar from '../pages/salon/SalonCalendar';
import MyCoupon from '../pages/salon/MyCoupon';
import SalonBookingHistory from '../pages/salon/SalonBookingHistory';
import CouponPage from '../pages/CouponPage';

import MainLayout from '../components/layout/MainLayout';

const AppRoutes = () => {
    return (
        <Routes>
            {/* NHÓM SỬ DỤNG HEADER CHUNG */}
            <Route element={<MainLayout />}>
                {/* --- NHÓM PUBLIC --- */}
                <Route path="/" element={<HomePage />} />
                <Route path="/coupons" element={<CouponPage />} />
                <Route path="/post/:id" element={<PostDetail />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/salon/:id" element={<SalonDetail />} />
                <Route path="/staff/:id" element={<StaffDetail />} />
                <Route path="/lookbook" element={<LookbookPage />} />
                <Route path="/lookbook/:id" element={<LookbookDetail />} />
                <Route path="/ai-analysis" element={<div>AI Analysis Page </div>} />
                <Route path="/category/:type" element={<div>Category Page </div>} />

                {/* --- NHÓM PROTECTED (Phân quyền) --- */}

                {/* Role: ALL AUTHENTICATED */}
                <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'SALON_OWNER', 'STAFF', 'ADMIN']} />}>
                    <Route path='/users/profile' element={<ProfilePage />} />
                    <Route path='/profile' element={<ProfilePage />} />
                    {/* Post Management */}
                    <Route path='/post/my-posts' element={<PostManagement />} />
                    <Route path='/post/create' element={<PostForm />} />
                    <Route path='/post/:id/edit' element={<PostForm />} />
                </Route>

                {/* Role: CUSTOMER */}
                <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
                    <Route path="/salon/register" element={<SalonRegistration />} />
                    <Route path="/book-appointment" element={<BookAppointment />} />
                    <Route path="/booking-history" element={<CustomerBookingHistory />} />
                </Route>
                {/* Role: SALON_OWNER & STAFF */}
                <Route element={<ProtectedRoute allowedRoles={['SALON_OWNER', 'STAFF']} />}>
                    <Route path="/salon" element={<SalonDashboard />} />
                    <Route path="/salon/dashboard" element={<SalonDashboard />} />
                    <Route path="/stafflist" element={<StaffList />} />
                    <Route path="/stafflist/add" element={<StaffRegistration />} />
                    <Route path="/salon/coupons" element={<MyCoupon />} />
                </Route>

                {/* Role: STAFF - Personal dashboard */}
                <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
                    <Route path="/staff/dashboard" element={<StaffDashboard />} />
                </Route>

                {/* Role: SALON_OWNER & STAFF (View Schedule) */}
                <Route element={<ProtectedRoute allowedRoles={['SALON_OWNER', 'STAFF']} />}>
                    <Route path="/salon/schedule" element={<SalonCalendar />} />
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
                <Route path='/admin/commission' element={<AdminCommissionConfig />} />
                <Route path='/admin/my-posts' element={<AdminMyPosts />} />
                <Route path='/admin/users' element={<AdminUsers />} />
                <Route path='/admin/reports' element={<AdminReports />} />
            </Route>

            {/* 404 - NOT FOUND */}
            <Route path="*" element={<div>404 - Page Not Found</div>} />
        </Routes>
    );
};

export default AppRoutes;