import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLogout } from '../../features/auth/hooks/useLogout';
import PendingApplications from './PendingApplications';
import '../../assets/css/AdminDashboard.css';
import { HiSparkles } from 'react-icons/hi';
import { GoPerson } from 'react-icons/go';

const AdminDashboard = () => {
    const { logout } = useLogout();
    const user = JSON.parse(localStorage.getItem('user'));
    const location = useLocation();
    const isOverview = location.pathname === '/admin/dashboard';
    const isMyPosts = location.pathname === '/admin/my-posts';
    const isUsers = location.pathname === '/admin/users';

    return (
        <div className="admin-wrapper">
            {/* --- HEADER CHỈ CÓ OVERVIEW --- */}
            <header className="admin-header">
                <div className="header-container">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                        {/* Logo Section */}
                        <div className="logo-section">
                            <HiSparkles size={24} color="#0d9488" />
                            <span>SalonHub</span>
                        </div>

                        <nav className="header-nav">
                            <Link className={`nav-link ${isOverview ? 'active' : ''}`} to="/admin/dashboard">
                                Overview
                            </Link>
                            <Link className={`nav-link ${isMyPosts ? 'active' : ''}`} to="/admin/my-posts">
                                My Posts
                            </Link>
                            <Link className={`nav-link ${isUsers ? 'active' : ''}`} to="/admin/users">
                                Users
                            </Link>
                        </nav>
                    </div>

                    <div className="header-right">
                        <div className="user-controls">
                            <button className="btn-sign-in">{user?.fullName || 'Admin'}</button>
                            <button className="btn-get-started" onClick={logout}>Logout</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- NỘI DUNG CHÍNH DÀN TRẢI XUỐNG DƯỚI --- */}
            <main className="admin-content-full">
                <div className="page-inner">

                    {/* 1. Phần tiêu đề */}
                    <div className="dynamic-header">
                        <h1>Platform Overview</h1>
                        <p>Monitor and manage the SalonHub marketplace</p>
                    </div>

                    {/* 2. Phần Stats Cards (Bạn có thể thêm code card ở đây) */}
                    <div className="stats-grid-placeholder">
                        {/* Ví dụ 4 card: Revenue, Salons, Users, Growth */}
                    </div>

                    {/* 3. Phần bảng Pending Applications nằm ngay bên dưới */}
                    <div className="section-divider"></div>

                    <div className="content-render-area">
                        {/* Gọi file table của bạn ở đây */}
                        <PendingApplications />
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;