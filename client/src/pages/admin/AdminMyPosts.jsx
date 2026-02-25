import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLogout } from '../../features/auth/hooks/useLogout';
import PostManagement from '../post/PostManagement';
import '../../assets/css/AdminDashboard.css';
import { HiSparkles } from 'react-icons/hi';

const AdminMyPosts = () => {
    const { logout } = useLogout();
    const user = JSON.parse(localStorage.getItem('user'));
    const location = useLocation();

    const isOverview = location.pathname === '/admin/dashboard';
    const isMyPosts = location.pathname === '/admin/my-posts';
    const isUsers = location.pathname === '/admin/users';

    return (
        <div className="admin-wrapper">
            <header className="admin-header">
                <div className="header-container">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
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

            <main className="admin-content-full">
                <div className="page-inner">
                    <PostManagement />
                </div>
            </main>
        </div>
    );
};

export default AdminMyPosts;
