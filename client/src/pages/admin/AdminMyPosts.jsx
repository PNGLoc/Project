import React from 'react';
import PostManagement from '../post/PostManagement';
import '../../assets/css/AdminDashboard.css';
import AdminHeader from '../../components/admin/AdminHeader';

const AdminMyPosts = () => {
    return (
        <div className="admin-wrapper">
            <AdminHeader />

            <main className="admin-content-full">
                <div className="page-inner">
                    <PostManagement />
                </div>
            </main>
        </div>
    );
};

export default AdminMyPosts;
