import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosClient from '../../lib/axios';
import '../../assets/css/SalonCalendar.css';
import AppointmentModal from '../../components/booking/AppointmentModal';

const SalonCalendar = () => {
    const [stylists, setStylists] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingAppointments, setFetchingAppointments] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const dateInputRef = useRef(null);

    // Auth State
    const userStr = localStorage.getItem('user');
    const isStaff = userStr ? JSON.parse(userStr)?.role === 'STAFF' : false;

    // Modal & Filter states
    const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    const timeSlots = [
        '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
    ];

    // Fetch staffs from API
    const fetchStylists = useCallback(async () => {
        try {
            setLoading(true);

            if (isStaff) {
                // For STAFF, we need their actual Staff _id (not User _id) to match appointments.
                const response = await axiosClient.get('/api/staffs/me');
                let staffsData = response.data?.data || response.data || [];
                const userObj = JSON.parse(localStorage.getItem('user'));
                const myStaffProfile = staffsData[0];

                if (myStaffProfile) {
                    setStylists([{
                        id: myStaffProfile._id,
                        name: myStaffProfile.fullName || userObj?.fullName || 'My Schedule',
                        appointments: 0
                    }]);
                } else {
                    setStylists([{
                        id: userObj?._id,
                        name: userObj?.fullName || 'My Schedule',
                        appointments: 0
                    }]);
                }
                return;
            }

            // Otherwise SALON_OWNER loads all staff
            const response = await axiosClient.get('/api/staffs');
            let staffsData = response.data?.data || response.data || [];
            if (Array.isArray(staffsData)) {
                // Map API staff to the format used by the calendar
                const mappedStylists = staffsData.map(staff => ({
                    id: staff._id,
                    name: staff.fullName || staff.userId?.fullName || 'Unknown Stylist',
                    appointments: 0 // Will calculate based on mock data below
                }));
                setStylists(mappedStylists);
            }
        } catch (err) {
            console.error('Failed to load stylists', err);
        } finally {
            setLoading(false);
        }
    }, [isStaff]);

    useEffect(() => {
        fetchStylists();
    }, [fetchStylists]);

    // --- FETCH REAL APPOINTMENTS ---
    const fetchAppointments = useCallback(async () => {
        if (stylists.length === 0) return;

        try {
            setFetchingAppointments(true);
            const dateStr = selectedDate.toISOString().split('T')[0];
            const response = await axiosClient.get(`/api/appointments/salon?date=${dateStr}`);

            const rawData = response.data?.data || [];

            // Map real data to calendar format
            const mapped = rawData.map(app => {
                const start = new Date(app.startAt);
                const end = new Date(app.endAt);

                const startHour = start.getHours();
                const startMins = start.getMinutes();
                const durationMins = (end - start) / 60000;

                // Format time Slot (e.g., "09:00")
                const timeSlot = `${String(startHour).padStart(2, '0')}:00`;

                // Use CSS stacking instead of dynamic top/height computation
                return {
                    id: app._id,
                    stylistId: app.staffId?._id || app.staffId,
                    timeSlot,
                    clientName: app.customerId?.fullName || app.clientName || 'Guest',
                    service: app.serviceSnapshot?.name || 'Service',
                    status: app.status.toLowerCase(),
                    timeRange: `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                };
            });

            setAppointments(mapped);
        } catch (err) {
            console.error('Failed to load appointments', err);
        } finally {
            setFetchingAppointments(false);
        }
    }, [selectedDate, stylists]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const activeDateStr = selectedDate.toISOString().split('T')[0];

    // Apply local filters for Status
    const filteredAppointments = appointments.filter(app => {
        if (filterStatus !== 'all' && app.status !== filterStatus) return false;
        return true;
    });

    // Calculate appointment counts per stylist for the active date
    const stylistsWithCounts = stylists.map(s => ({
        ...s,
        appointments: filteredAppointments.filter(app => app.stylistId === s.id).length
    }));

    const getAppointmentsForSlot = (stylistId, time) => {
        return filteredAppointments.filter(app => app.stylistId === stylistId && app.timeSlot === time);
    };

    const stats = {
        total: filteredAppointments.length,
        confirmed: filteredAppointments.filter(a => a.status === 'confirmed').length,
        pending: filteredAppointments.filter(a => a.status === 'pending').length,
        completed: filteredAppointments.filter(a => a.status === 'completed').length
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const handleAppointmentClick = (appId) => {
        setSelectedAppointmentId(appId);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedAppointmentId(null);
    };

    const handleUpdateSuccess = () => {
        fetchAppointments(); // Refresh calendar data
    };

    const handlePrevDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    const handleDateChange = (e) => {
        const newDate = new Date(e.target.value);
        if (!isNaN(newDate.getTime())) {
            setSelectedDate(newDate);
        }
    };

    const triggerDatePicker = () => {
        if (dateInputRef.current) {
            // Modern browsers support showPicker()
            if (typeof dateInputRef.current.showPicker === 'function') {
                dateInputRef.current.showPicker();
            } else {
                dateInputRef.current.click();
            }
        }
    };

    // Format date for input value (YYYY-MM-DD)
    const inputFormattedDate = selectedDate.toISOString().split('T')[0];

    if (loading) {
        return (
            <div className="calendar-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
                <div className="loading-spinner">Loading staff and schedule...</div>
            </div>
        );
    }

    if (stylists.length === 0) {
        return (
            <div className="calendar-page" style={{ textAlign: 'center', padding: '50px' }}>
                <h3>No staff found for this salon.</h3>
                <p>Please add staff in the "Staff" tab first.</p>
            </div>
        );
    }

    return (
        <div className="calendar-page">
            {/* Header Area */}
            <header className="calendar-header">
                <div className="calendar-title-section">
                    <h1>Calendar Scheduler</h1>
                    <p>Manage appointments and stylist schedules</p>
                </div>
                <div className="calendar-actions">
                    <div className="filter-dropdown-container">
                        <button className="btn-filter" style={{ minWidth: '160px', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                {filterStatus === 'all' ? 'All Statuses' : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                            </span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                        <div className="filter-dropdown-menu admin-card" style={{ marginBottom: 0 }}>
                            <div className="filter-option" onClick={() => setFilterStatus('all')}>All Statuses</div>
                            <div className="filter-option" onClick={() => setFilterStatus('pending')}>Pending</div>
                            <div className="filter-option" onClick={() => setFilterStatus('confirmed')}>Confirmed</div>
                            <div className="filter-option" onClick={() => setFilterStatus('completed')}>Completed</div>
                            <div className="filter-option" onClick={() => setFilterStatus('cancelled')}>Cancelled</div>
                        </div>
                    </div>
                    {!isStaff && (
                        <button className="btn-new">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            New Appointment
                        </button>
                    )}
                </div>
            </header>

            {/* Date Navigator */}
            <div className="admin-card">
                <div className="admin-card-content date-navigator">
                    <button className="nav-btn" onClick={handlePrevDay}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>

                    <div className="date-picker-wrapper">
                        <input
                            type="date"
                            ref={dateInputRef}
                            className="hidden-date-input"
                            value={inputFormattedDate}
                            onChange={handleDateChange}
                        />
                        <button className="current-date-btn" onClick={triggerDatePicker}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            {formatDate(selectedDate)}
                        </button>
                    </div>

                    <button className="nav-btn" onClick={handleNextDay}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            </div>

            {/* Legend & Help */}
            <div className="status-legend">
                <span className="legend-label">Status:</span>
                <span className="badge pending">Pending</span>
                <span className="badge confirmed">Confirmed</span>
                <span className="badge completed">Completed</span>
                <span className="badge cancelled">Cancelled</span>

                <span className="drag-tip">
                    💡 Tip: Click on an appointment to view or edit details
                </span>
            </div>

            {/* Main Calendar Grid */}
            <div className="calendar-container" style={{ position: 'relative' }}>
                {fetchingAppointments && (
                    <div className="fetching-overlay">
                        <div className="mini-spinner"></div>
                    </div>
                )}
                <div className="calendar-grid" style={{ gridTemplateColumns: `100px repeat(${stylistsWithCounts.length}, 1fr)` }}>
                    {/* Header Row */}
                    <div className="grid-header-row">
                        {/* Corner Header */}
                        <div className="grid-header time-col">
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Time</span>
                        </div>

                        {/* Staff Headers */}
                        {stylistsWithCounts.map((stylist, index) => {
                            // Cycle through some colors for the top border
                            const colors = ['#0d9488', '#f472b6', '#eab308', '#a855f7'];
                            const borderColor = colors[index % colors.length];

                            return (
                                <div key={stylist.id} className="grid-header" style={{ borderTop: `3px solid ${borderColor}` }}>
                                    <div className="staff-info">
                                        <span className="staff-name">{stylist.name}</span>
                                        <span className="staff-meta">{stylist.appointments} appointments</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Slots & Appointments */}
                    {timeSlots.map(time => (
                        <React.Fragment key={time}>
                            <div className="time-cell">{time}</div>
                            {stylistsWithCounts.map(stylist => (
                                <div key={`${stylist.id}-${time}`} className="slot-cell">
                                    {getAppointmentsForSlot(stylist.id, time).map(app => (
                                        <div
                                            key={app.id}
                                            className={`appointment-card ${app.status}`}
                                            style={{ cursor: isStaff ? 'default' : 'pointer' }}
                                            onClick={() => {
                                                if (!isStaff) handleAppointmentClick(app.id);
                                            }}
                                        >
                                            <span className="client-name" title={app.clientName}>{app.clientName}</span>
                                            <span className="service-name" title={app.service}>{app.service}</span>
                                            <div className="apt-meta">
                                                <span className={`status-badge-inline ${app.status}`}>
                                                    {app.status}
                                                </span>
                                                <span className="time-range">{app.timeRange}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Footer Statistics */}
            <div className="calendar-footer">
                <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="stat-card-content">
                        <span className="stat-value primary">{stats.total}</span>
                        <span className="stat-label">Total Appointments</span>
                    </div>
                </div>
                <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="stat-card-content">
                        <span className="stat-value">{stats.confirmed}</span>
                        <span className="stat-label">Confirmed</span>
                    </div>
                </div>
                <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="stat-card-content">
                        <span className="stat-value yellow">{stats.pending}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                </div>
                <div className="admin-card" style={{ marginBottom: 0 }}>
                    <div className="stat-card-content">
                        <span className="stat-value green">{stats.completed}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                </div>
            </div>

            {/* Premium Appointment Detail & Edit Modal */}
            <AppointmentModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                appointmentId={selectedAppointmentId}
                onUpdateSuccess={handleUpdateSuccess}
            />
        </div>
    );
};


export default SalonCalendar;
