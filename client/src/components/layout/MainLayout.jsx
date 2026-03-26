import React from 'react';
import { Outlet } from 'react-router-dom';
import HeaderHome from './HeaderHome';
import AdminHeader from '../admin/AdminHeader';

const MainLayout = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = currentUser?.role === 'ADMIN';

    return (
        <div className="home-container">
            {isAdmin ? <AdminHeader /> : <HeaderHome />}
            <Outlet />
        </div>
    );
};

export default MainLayout;
