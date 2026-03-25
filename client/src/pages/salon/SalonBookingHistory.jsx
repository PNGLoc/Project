import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import { FiSearch, FiCalendar, FiUser, FiScissors, FiFilter, FiChevronUp, FiChevronDown, FiRefreshCcw } from 'react-icons/fi';
import '../../assets/css/SalonBookingHistory.css';

const SalonBookingHistory = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffs, setStaffs] = useState([]);
    const [reportModal, setReportModal] = useState({ open: false, appointment: null });
    const [reportForm, setReportForm] = useState({ reason: '', description: '' });
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportedAppointmentIds, setReportedAppointmentIds] = useState(() => new Set());

    // Filter & Sort State
    const [filters, setFilters] = useState({
        customerName: '',
        serviceName: '',
        status: '',
        staffId: '',
        startDate: '',
        endDate: ''
    });

    const [sort, setSort] = useState({
        sortBy: 'startAt',
        order: 'desc'
    });

    const getUser = () => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch (e) {
            return {};
        }
    };
    const user = getUser();
    const isStaffUser = user?.role === 'STAFF';
    const isOwnerUser = user?.role === 'SALON_OWNER';

    const fetchStaffs = async () => {
        try {
            const res = await axiosClient.get('/api/staffs');
            const staffList = Array.isArray(res.data?.data) ? res.data.data : [];
            setStaffs(staffList);
        } catch (err) {
            console.error("Failed to fetch staffs", err);
        }
    };

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                ...filters,
                ...sort
            };

            // Lọc bỏ params trống
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await axiosClient.get('/api/appointments/salon', { params });
            setAppointments(response.data?.data || []);
        } catch (err) {
            toast.error("Error loading booking history");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters, sort]);

    const fetchReportedAppointments = useCallback(async () => {
        if (!isOwnerUser) return;
        try {
            const res = await axiosClient.get('/api/reports/provider/reported-appointments');
            const ids = Array.isArray(res.data?.data) ? res.data.data : [];
            setReportedAppointmentIds(new Set(ids));
        } catch (err) {
            // Non-blocking: just log
            console.error('[SALON BOOKING HISTORY] Failed to fetch reported appointments', err);
        }
    }, [isOwnerUser]);

    useEffect(() => {
        fetchStaffs();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchAppointments();
        }, 300); // Debounce search input
        return () => clearTimeout(timeoutId);
    }, [fetchAppointments]);

    useEffect(() => {
        fetchReportedAppointments();
    }, [fetchReportedAppointments]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const toggleSort = (field) => {
        setSort(prev => ({
            sortBy: field,
            order: prev.sortBy === field && prev.order === 'desc' ? 'asc' : 'desc'
        }));
    };

    const resetFilters = () => {
        setFilters({
            customerName: '',
            serviceName: '',
            status: '',
            staffId: '',
            startDate: '',
            endDate: ''
        });
        setSort({
            sortBy: 'startAt',
            order: 'desc'
        });
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'PENDING': return 'status-pending';
            case 'CONFIRMED': return 'status-confirmed';
            case 'COMPLETED': return 'status-completed';
            case 'CANCELLED': return 'status-cancelled';
            default: return '';
        }
    };

    const formatVND = (amount) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const renderCustomerReview = (appointment) => {
        const review = appointment?.review;
        if (!review) return <span style={{ color: '#6b7280' }}>No customer review yet</span>;
        const rating = Number(review.rating || 0);
        const comment = String(review.comment || '').trim();
        const filled = Math.min(5, Math.max(0, Math.round(rating)));
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', gap: '2px', lineHeight: 1 }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <span
                            key={n}
                            style={{
                                fontSize: '16px',
                                color: n <= filled ? '#f59e0b' : '#d1d5db'
                            }}
                        >
                            ★
                        </span>
                    ))}
                </div>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{comment || '(No comment)'}</span>
            </div>
        );
    };

    const isWalkInGuest = (appointment) => {
        const email = String(appointment?.customerId?.email || '').toLowerCase();
        const fullName = String(appointment?.customerId?.fullName || '').toLowerCase();
        return email === 'guest.customer@boms.vn' || fullName === 'walk-in guest';
    };

    const openReportModal = (appointment) => {
        setReportForm({ reason: '', description: '' });
        setReportModal({ open: true, appointment });
    };

    const closeReportModal = () => {
        if (reportSubmitting) return;
        setReportModal({ open: false, appointment: null });
        setReportForm({ reason: '', description: '' });
    };

    const submitReport = async () => {
        try {
            if (!reportModal.appointment?._id) return;
            const description = String(reportForm.description || '').trim();
            if (!description) {
                toast.error('Please enter a description');
                return;
            }
            setReportSubmitting(true);
            await axiosClient.post('/api/reports/provider', {
                appointmentId: reportModal.appointment._id,
                reason: reportForm.reason,
                description
            });
            toast.success('Report submitted');
            setReportedAppointmentIds((prev) => {
                const next = new Set(prev);
                next.add(reportModal.appointment._id);
                return next;
            });
            closeReportModal();
        } catch (err) {
            const message = err?.response?.data?.message || 'Failed to submit report';
            toast.error(message);
        } finally {
            setReportSubmitting(false);
        }
    };

    return (
        <div className="booking-history-container">
            <div className="history-filter-bar">
                <div className="filter-group">
                    <label><FiUser /> Customer</label>
                    <input
                        type="text"
                        name="customerName"
                        value={filters.customerName}
                        onChange={handleFilterChange}
                        placeholder="Search customer..."
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label><FiScissors /> Service</label>
                    <input
                        type="text"
                        name="serviceName"
                        value={filters.serviceName}
                        onChange={handleFilterChange}
                        placeholder="Search service..."
                        className="filter-input"
                    />
                </div>
                {!isStaffUser && (
                    <div className="filter-group">
                        <label>Staff Member</label>
                        <select
                            name="staffId"
                            value={filters.staffId}
                            onChange={handleFilterChange}
                            className="filter-select"
                        >
                            <option value="">All Staff</option>
                            {staffs.map(s => (
                                <option key={s._id} value={s._id}>{s.fullName}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="filter-group">
                    <label>Status</label>
                    <select
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="filter-select"
                    >
                        <option value="">All Statuses</option>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
                <div className="filter-group">
                    <label><FiCalendar /> Start Date</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleFilterChange}
                        className="filter-input"
                    />
                </div>
                <div className="filter-group">
                    <label><FiCalendar /> End Date</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleFilterChange}
                        className="filter-input"
                    />
                </div>
                <button className="reset-btn" onClick={resetFilters}>
                    <FiRefreshCcw style={{ marginRight: '8px' }} /> Reset Filters
                </button>
            </div>

            <div className="history-table-wrapper">
                <table className="history-table">
                    <thead>
                        <tr>
                            <th onClick={() => toggleSort('startAt')}>
                                Date & Time
                                {sort.sortBy === 'startAt' && (
                                    <span className="sort-icon">{sort.order === 'desc' ? <FiChevronDown /> : <FiChevronUp />}</span>
                                )}
                            </th>
                            <th onClick={() => toggleSort('customer')}>
                                Customer
                                {sort.sortBy === 'customer' && (
                                    <span className="sort-icon">{sort.order === 'desc' ? <FiChevronDown /> : <FiChevronUp />}</span>
                                )}
                            </th>
                            <th onClick={() => toggleSort('service')}>
                                Service
                                {sort.sortBy === 'service' && (
                                    <span className="sort-icon">{sort.order === 'desc' ? <FiChevronDown /> : <FiChevronUp />}</span>
                                )}
                            </th>
                            <th onClick={() => toggleSort('staff')}>
                                Staff
                                {sort.sortBy === 'staff' && (
                                    <span className="sort-icon">{sort.order === 'desc' ? <FiChevronDown /> : <FiChevronUp />}</span>
                                )}
                            </th>
                            <th onClick={() => toggleSort('totalPrice')}>
                                Price
                                {sort.sortBy === 'totalPrice' && (
                                    <span className="sort-icon">{sort.order === 'desc' ? <FiChevronDown /> : <FiChevronUp />}</span>
                                )}
                            </th>
                            <th onClick={() => toggleSort('status')}>
                                Status
                                {sort.sortBy === 'status' && (
                                    <span className="sort-icon">{sort.order === 'desc' ? <FiChevronDown /> : <FiChevronUp />}</span>
                                )}
                            </th>
                            <th>
                                Customer review
                            </th>
                            {!isStaffUser && (
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && appointments.length === 0 ? (
                            <tr>
                                <td colSpan={!isStaffUser ? 8 : 7} style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td>
                            </tr>
                        ) : appointments.length === 0 ? (
                            <tr>
                                <td colSpan={!isStaffUser ? 8 : 7} className="history-empty-state">
                                    <i>📭</i>
                                    No matching appointments found.
                                </td>
                            </tr>
                        ) : (
                            appointments.map(app => (
                                <tr key={app._id}>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{new Date(app.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                                        <div style={{ fontSize: '12px' }}>{new Date(app.startAt).toLocaleDateString('en-US')}</div>
                                    </td>
                                    <td>
                                        <div className="customer-info">
                                            <span className="customer-name">{app.customerId?.fullName || 'Walk-in Guest'}</span>
                                            <span className="customer-phone">{app.customerId?.phone || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>{app.serviceSnapshot?.name}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{app.serviceSnapshot?.duration} mins</div>
                                    </td>
                                    <td>{app.staffSnapshot?.fullName || app.staffId?.fullName}</td>
                                    <td><span className="price-text">{formatVND(app.totalPrice)}</span></td>
                                    <td>
                                        <span className={`status-pill ${getStatusClass(app.status)}`}>
                                            {app.status === 'PENDING' ? 'Pending' :
                                                app.status === 'CONFIRMED' ? 'Confirmed' :
                                                    app.status === 'COMPLETED' ? 'Completed' : 'Cancelled'}
                                        </span>
                                    </td>
                                    <td>{renderCustomerReview(app)}</td>
                                    {!isStaffUser && (
                                        <td style={{ textAlign: 'right' }}>
                                            {isOwnerUser && !isWalkInGuest(app) ? (
                                                reportedAppointmentIds.has(app._id) ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: 10,
                                                            border: '1px solid #e5e7eb',
                                                            background: '#f9fafb',
                                                            color: '#6b7280',
                                                            cursor: 'not-allowed',
                                                            fontWeight: 600,
                                                        }}
                                                        title="This booking has already been reported"
                                                    >
                                                        Reported
                                                    </button>
                                                ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => openReportModal(app)}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderRadius: 10,
                                                        border: '1px solid #fecaca',
                                                        background: '#fff',
                                                        color: '#b91c1c',
                                                        cursor: 'pointer',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Report
                                                </button>
                                                )
                                            ) : (
                                                <span style={{ color: '#9ca3af', fontSize: 12 }}>-</span>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {reportModal.open && (
                <div
                    className="admin-modal-backdrop"
                    onClick={closeReportModal}
                    style={{ zIndex: 50 }}
                >
                    <div
                        className="admin-modal"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: 560 }}
                    >
                        <div className="admin-modal-header">
                            <h3>Report customer</h3>
                            <button
                                type="button"
                                className="admin-modal-close"
                                onClick={closeReportModal}
                                disabled={reportSubmitting}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ fontSize: 13, color: '#6b7280' }}>
                                Booking:{' '}
                                <b>{reportModal.appointment?.serviceSnapshot?.name || 'Service'}</b>{' '}
                                {reportModal.appointment?.startAt ? `- ${new Date(reportModal.appointment.startAt).toLocaleString('vi-VN')}` : ''}
                                <br />
                                Customer:{' '}
                                <b>{reportModal.appointment?.customerId?.fullName || '-'}</b>{' '}
                                {reportModal.appointment?.customerId?.email ? `(${reportModal.appointment.customerId.email})` : ''}
                            </div>

                            <div style={{ display: 'grid', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>Reason</label>
                                <select
                                    value={reportForm.reason}
                                    onChange={(e) => setReportForm((p) => ({ ...p, reason: e.target.value }))}
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #e5e7eb',
                                        background: 'white',
                                        fontSize: 14,
                                    }}
                                >
                                    <option value="">Select a reason (optional)</option>
                                    <option value="NO_SHOW">No show</option>
                                    <option value="LATE">Arrived too late</option>
                                    <option value="RUDE_BEHAVIOR">Rude behavior</option>
                                    <option value="PAYMENT_ISSUE">Payment issue</option>
                                    <option value="SPAM_BOOKING">Spam booking</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div style={{ display: 'grid', gap: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 600 }}>Description *</label>
                                <textarea
                                    value={reportForm.description}
                                    onChange={(e) => setReportForm((p) => ({ ...p, description: e.target.value }))}
                                    rows={5}
                                    placeholder="Describe what happened..."
                                    style={{
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid #e5e7eb',
                                        resize: 'vertical',
                                        fontSize: 14,
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={closeReportModal}
                                    disabled={reportSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn-approve-teal"
                                    onClick={submitReport}
                                    disabled={reportSubmitting}
                                >
                                    {reportSubmitting ? 'Submitting...' : 'Submit report'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalonBookingHistory;
