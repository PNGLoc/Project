import React, { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import HeaderHome from '../../components/layout/HeaderHome';
import ServiceManagement from './ServiceManagement';
import '../../assets/css/SalonDashboard.css';

const SalonDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const user = JSON.parse(localStorage.getItem('user'));
    // Call hooks unconditionally to preserve hooks order across renders
    const matchStaffBase = useMatch('/salon/staff');
    const matchStaffAll = useMatch('/salon/staff/*');
    const isStaffRoute = Boolean(matchStaffBase || matchStaffAll);
    const isStaffUser = user?.role === 'STAFF';

    return (
        <div className="salon-full-layout">

            <main className="salon-main-wrapper">
                {!isStaffRoute && (
                    <>
                        <header className="dashboard-top-bar">
                            <div className="dynamic-title">
                                {!isStaffUser && (activeTab === 'overview' ? (
                                    <>
                                        <h1>Partner Dashboard</h1>
                                        <p>Welcome back! Here's what's happening today.</p>
                                    </>
                                ) : (
                                    <>
                                        <h1>Service Management</h1>
                                        <p>Manage and update your salon's service menu</p>
                                    </>
                                ))}
                                {isStaffUser && (
                                    <>
                                        <h1>Staff Area</h1>
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
                    </>
                )}

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