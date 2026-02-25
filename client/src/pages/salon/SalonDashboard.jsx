import React, { useState, useEffect } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import HeaderHome from '../../components/layout/HeaderHome';
import ServiceManagement from './ServiceManagement';
import SalonCalendar from './SalonCalendar';
import Overview from './Overview';
import '../../assets/css/SalonDashboard.css';

const SalonDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const user = JSON.parse(localStorage.getItem('user'));
    const isStaffRoute = useMatch('/salon/staff') || useMatch('/salon/staff/*');
    const isStaffUser = user?.role === 'STAFF';

    return (
        <div className="salon-full-layout">
            <main className="salon-main-wrapper">
                {!isStaffRoute && (
                    <header className="dashboard-top-bar">
                        <div className="dynamic-title">
                            {!isStaffUser && (activeTab === 'overview' ? (
                                <>
                                    <h1>Partner Dashboard</h1>
                                    <p>Welcome back! Here's what's happening today.</p>
                                </>
                            ) : activeTab === 'services' ? (
                                <>
                                    <h1>Service Management</h1>
                                    <p>Manage and update your salon's service menu</p>
                                </>
                            ) : activeTab === 'calendar' ? (
                                <>
                                    <h1>Calendar Scheduler</h1>
                                    <p>View and manage appointments</p>
                                </>
                            ) : (
                                <>
                                    <h1>Partner Dashboard</h1>
                                    <p>Welcome back! Here's what's happening today.</p>
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
                            <button
                                className={`tab-btn-link ${activeTab === 'calendar' ? 'active' : ''}`}
                                onClick={() => setActiveTab('calendar')}
                            >
                                Calendar
                            </button>
                        </nav>
                        <div className="header-balance-div"></div>
                    </header>
                )}

                <div className="content-render-area">
                    {isStaffRoute ? (
                        <Outlet />
                    ) : (
                        <>
                            {activeTab === 'overview' && (
                                <Overview onTabChange={setActiveTab} />
                            )}
                            {activeTab === 'services' && <ServiceManagement />}
                            {activeTab === 'calendar' && <SalonCalendar />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SalonDashboard;