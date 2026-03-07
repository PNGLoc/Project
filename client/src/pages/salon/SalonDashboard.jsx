import React, { useState } from 'react';
import HeaderHome from '../../components/layout/HeaderHome';
import ServiceManagement from './ServiceManagement';
import SalonCalendar from './SalonCalendar';
import Overview from './Overview';
import BookingHistory from './BookingHistory';
import '../../assets/css/SalonDashboard.css';

const SalonDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const user = JSON.parse(localStorage.getItem('user'));
    const isStaffUser = user?.role === 'STAFF';

    return (
        <div className="salon-full-layout">
            <main className="salon-main-wrapper">
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
                        ) : activeTab === 'history' ? (
                            <>
                                <h1>Booking History</h1>
                                <p>Review and filter past appointments</p>
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
                        <button
                            className={`tab-btn-link ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                    </nav>
                    <div className="header-balance-div"></div>
                </header>

                <div className="content-render-area">
                    {activeTab === 'overview' && (
                        <Overview onTabChange={setActiveTab} />
                    )}
                    {activeTab === 'services' && <ServiceManagement />}
                    {activeTab === 'calendar' && <SalonCalendar />}
                    {activeTab === 'history' && <BookingHistory />}
                </div>
            </main>
        </div>
    );
};

export default SalonDashboard;