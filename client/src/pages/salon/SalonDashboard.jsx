import React, { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import HeaderHome from '../../components/layout/HeaderHome';
import ServiceManagement from './ServiceManagement';
import '../../assets/css/SalonDashboard.css';

const SalonDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const user = JSON.parse(localStorage.getItem('user'));
    const isStaffRoute = useMatch('/salon/staff/*');

    return (
        <div className="salon-full-layout">
            <HeaderHome />

            <main className="salon-main-wrapper">
                <header className="dashboard-top-bar">
                    <div className="dynamic-title">
                        {activeTab === 'overview' ? (
                            <>
                                <h1>Partner Dashboard</h1>
                                <p>Welcome back! Here's what's happening today.</p>
                            </>
                        ) : (
                            <>
                                <h1>Service Management</h1>
                                <p>Manage and update your salon's service menu</p>
                            </>
                        )}
                    </div>

                    <nav className="dashboard-nav-container">
                        <button
                            className={`tab-btn-link ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`tab-btn-link ${activeTab === 'services' ? 'active' : ''}`}
                            onClick={() => setActiveTab('services')}
                        >
                            Services
                        </button>
                    </nav>
                </header>

                <div className="content-render-area">
                    {isStaffRoute ? (
                        <Outlet />
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <div className="overview-container">
                                    <div className="placeholder-card" style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <p>No Data</p>
                                    </div>
                                </div>
                            )}


                            {activeTab === 'services' && <ServiceManagement />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SalonDashboard;