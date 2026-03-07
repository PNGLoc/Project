import React, { useState, useEffect, useCallback } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import { FiSearch, FiCalendar, FiUser, FiScissors, FiFilter, FiChevronUp, FiChevronDown, FiRefreshCcw } from 'react-icons/fi';
import '../../assets/css/BookingHistory.css';

const BookingHistory = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [staffs, setStaffs] = useState([]);

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

    useEffect(() => {
        fetchStaffs();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchAppointments();
        }, 300); // Debounce search input
        return () => clearTimeout(timeoutId);
    }, [fetchAppointments]);

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
                        </tr>
                    </thead>
                    <tbody>
                        {loading && appointments.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>Loading history...</td>
                            </tr>
                        ) : appointments.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="history-empty-state">
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
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BookingHistory;
