import React from 'react';
import { Outlet } from 'react-router-dom';
import HeaderHome from './HeaderHome';

const MainLayout = () => {
    return (
        <div className="home-container">
            <HeaderHome />
            <Outlet />
        </div>
    );
};

export default MainLayout;
