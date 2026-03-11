import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../lib/axios';
import { FiSearch, FiMapPin, FiClock, FiImage, FiScissors, FiCheckCircle, FiXCircle, FiRotateCcw, FiFilter, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';
import '../../assets/css/CustomerBookingHistory.css';

const parsedCancelHours = Number(import.meta.env.VITE_BOOKING_CANCEL_DEADLINE_HOURS || 2);
const CANCELLATION_WINDOW_HOURS = Number.isFinite(parsedCancelHours) && parsedCancelHours >= 0 ? parsedCancelHours : 2;

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return date.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatCurrency = (value) => {
    if (value === null || value === undefined) return '-';
    return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
};

const CustomerBookingHistory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('ALL');
    const [filters, setFilters] = useState({
        salonName: '',
        startDate: '',
        endDate: '',
        sort: 'newest'
    });
    const [showSortMenu, setShowSortMenu] = useState(false);
    const sortMenuRef = useRef(null);

    // Close sort menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getSortLabel = () => {
        switch (filters.sort) {
            case 'newest': return 'Newest first';
            case 'oldest': return 'Oldest first';
            case 'price_asc': return 'Price: Low to High';
            case 'price_desc': return 'Price: High to Low';
            default: return 'Sort By';
        }
    };

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                status: activeTab === 'ALL' ? '' : activeTab,
                ...filters
            };

            // Mapping sort values
            if (filters.sort === 'newest') {
                params.sortBy = 'startAt';
                params.order = 'desc';
            } else if (filters.sort === 'oldest') {
                params.sortBy = 'startAt';
                params.order = 'asc';
            } else if (filters.sort === 'price_asc') {
                params.sortBy = 'totalPrice';
                params.order = 'asc';
            } else if (filters.sort === 'price_desc') {
                params.sortBy = 'totalPrice';
                params.order = 'desc';
            }

            delete params.sort;

            // Remove empty params
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const res = await axiosClient.get('/api/appointments/my', { params });
            setItems(res.data?.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load booking history.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, filters]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHistory();
        }, 400);
        return () => clearTimeout(timeoutId);
    }, [fetchHistory]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        setFilters({
            salonName: '',
            startDate: '',
            endDate: '',
            sort: 'newest'
        });
    };

    const getStatusInfo = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return { text: 'Waiting for Confirmation', class: 'status-pending' };
            case 'CONFIRMED':
                return { text: 'Confirmed', class: 'status-confirmed' };
            case 'COMPLETED':
                return { text: 'Completed', class: 'status-completed' };
            case 'CANCELLED':
                return { text: 'Cancelled', class: 'status-cancelled' };
            default:
                return { text: status, class: '' };
        }
    };

    const getImageUrl = (image) => {
        if (!image) return null;
        let imgPath = Array.isArray(image) ? image[0] : image;
        if (!imgPath) return null;
        if (imgPath.startsWith('http')) return imgPath;

        // Remove leading slash if exists to avoid double slash with baseUrl
        const sanitizedPath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;
        return `http://localhost:5000/${sanitizedPath.replace(/\\/g, '/')}`;
    };

    const getDisplaySalonInfo = (appointment) => {
        return {
            id: appointment.salonId?._id || appointment.salonId,
            name: appointment.salonSnapshot?.name || appointment.salonId?.name || 'Salon',
            address: appointment.salonSnapshot?.address || appointment.salonId?.address?.street || '',
            image: appointment.salonSnapshot?.image || (appointment.salonId?.images && appointment.salonId.images[0]) || ''
        };
    };

    const getCancelEligibility = (appointment) => {
        if (!appointment?.startAt) {
            return { canCancel: false, reason: 'Missing appointment schedule.' };
        }

        if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
            return { canCancel: false, reason: 'Only pending/confirmed bookings can be cancelled.' };
        }

        const startTime = new Date(appointment.startAt).getTime();
        const minAllowed = Date.now() + CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;

        if (startTime < minAllowed) {
            return {
                canCancel: false,
                reason: `Cancellation is only allowed at least ${CANCELLATION_WINDOW_HOURS} hour(s) before your appointment.`
            };
        }

        return { canCancel: true, reason: '' };
    };

    const handleCancelAppointment = async (appointment) => {
        const eligibility = getCancelEligibility(appointment);
        if (!eligibility.canCancel) {
            toast.warning(eligibility.reason);
            return;
        }

        if (!window.confirm("Are you sure you want to cancel this booking?")) return;

        try {
            const res = await axiosClient.patch(`/api/appointments/${appointment._id}/cancel`);
            if (res.data.success) {
                const refundedAmount = Number(res.data?.refundedAmount || 0);
                if (refundedAmount > 0) {
                    toast.success(`Booking cancelled. ${formatCurrency(refundedAmount)} refunded to your wallet.`);
                } else {
                    toast.success("Booking cancelled successfully.");
                }
                fetchHistory(); // Refresh list
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to cancel booking.");
        }
    };

    return (
        <div className="customer-history-view">
            <div className="history-header-section">
                <h1>Service Booking History</h1>
                <p>Track your beauty journey with us</p>
            </div>

            {/* Status Tabs */}
            <div className="status-tabs-container">
                <div className="status-tabs">
                    {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(tab => (
                        <button
                            key={tab}
                            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'ALL' ? 'All Bookings' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="history-filter-container">
                <div className="filter-search-wrapper">
                    <FiSearch className="filter-icon" />
                    <input
                        type="text"
                        name="salonName"
                        placeholder="Search by salon name..."
                        value={filters.salonName}
                        onChange={handleFilterChange}
                    />
                </div>

                <div className="filter-sort-wrapper" ref={sortMenuRef}>
                    <div
                        className="filter-sort-trigger"
                        onClick={() => setShowSortMenu(!showSortMenu)}
                    >
                        <FiFilter className="filter-icon" />
                        <span>{getSortLabel()}</span>
                        <FiChevronDown className={`chevron-icon ${showSortMenu ? 'rotate' : ''}`} />
                    </div>

                    {showSortMenu && (
                        <div className="custom-sort-menu">
                            <div className={`menu-item ${filters.sort === 'newest' ? 'selected' : ''}`}
                                onClick={() => { setFilters(prev => ({ ...prev, sort: 'newest' })); setShowSortMenu(false); }}>
                                Newest first
                            </div>
                            <div className={`menu-item ${filters.sort === 'oldest' ? 'selected' : ''}`}
                                onClick={() => { setFilters(prev => ({ ...prev, sort: 'oldest' })); setShowSortMenu(false); }}>
                                Oldest first
                            </div>
                            <div className={`menu-item ${filters.sort === 'price_asc' ? 'selected' : ''}`}
                                onClick={() => { setFilters(prev => ({ ...prev, sort: 'price_asc' })); setShowSortMenu(false); }}>
                                Price: Low to High
                            </div>
                            <div className={`menu-item ${filters.sort === 'price_desc' ? 'selected' : ''}`}
                                onClick={() => { setFilters(prev => ({ ...prev, sort: 'price_desc' })); setShowSortMenu(false); }}>
                                Price: High to Low
                            </div>
                        </div>
                    )}
                </div>

                <button className="btn-reset-filters" onClick={resetFilters}>
                    <FiRotateCcw /> Reset Filters
                </button>
            </div>

            <div className="history-content-list">
                {loading && (
                    <div className="list-loading">
                        <div className="green-spinner"></div>
                        <p>Updating your history...</p>
                    </div>
                )}

                {error && <div className="list-error">{error}</div>}

                {!loading && !error && items.length === 0 && (
                    <div className="list-empty">
                        <div className="empty-icon"><FiImage /></div>
                        <h3>No appointments yet</h3>
                        <p>Your beauty story hasn't started here yet. Book your first session now!</p>
                        <Link to="/book-appointment" className="btn-book-now">Book Appointment</Link>
                    </div>
                )}

                {!loading && !error && items.map((appointment) => {
                    const status = getStatusInfo(appointment.status);
                    const salonInfo = getDisplaySalonInfo(appointment);
                    const cancelEligibility = getCancelEligibility(appointment);
                    return (
                        <div className="booking-card" key={appointment._id}>
                            <div className="card-top">
                                <Link to={`/salon/${salonInfo.id}`} className="salon-brand-info">
                                    <FiMapPin className="pin-icon" />
                                    <span className="salon-name">{salonInfo.name}</span>
                                </Link>
                                <div className={`status-label ${status.class}`}>
                                    {status.text}
                                </div>
                            </div>

                            <div className="card-body">
                                <div className="salon-thumbnail">
                                    {getImageUrl(salonInfo.image) ? (
                                        <img src={getImageUrl(salonInfo.image)} alt="Salon" />
                                    ) : (
                                        <div className="no-image"><FiImage /></div>
                                    )}
                                </div>
                                <div className="booking-details">
                                    <h3 className="service-name">{appointment.serviceSnapshot?.name}</h3>
                                    <div className="info-row">
                                        <FiScissors className="mini-icon" />
                                        <span>Stylist: {appointment.staffSnapshot?.fullName}</span>
                                    </div>
                                    <div className="info-row">
                                        <FiClock className="mini-icon" />
                                        <span>Time: {formatDateTime(appointment.startAt)}</span>
                                    </div>
                                    <div className="info-row">
                                        <FiCheckCircle className="mini-icon" />
                                        <span>Payment: {appointment.paymentMethod} - {appointment.paymentStatus}</span>
                                    </div>
                                </div>
                                <div className="price-side">
                                    <div className="price-label">Price</div>
                                    <div className="price-value">{formatCurrency(appointment.totalPrice)}</div>
                                </div>
                            </div>

                            <div className="card-footer">
                                <div className="footer-left">
                                    {appointment.status === 'COMPLETED' && (
                                        <span className="success-note"><FiCheckCircle /> Service completed</span>
                                    )}
                                    {appointment.status === 'CANCELLED' && (
                                        <span className="cancel-note"><FiXCircle /> Service cancelled</span>
                                    )}
                                    {appointment.paymentStatus === 'REFUNDED' && (
                                        <span className="success-note"><FiCheckCircle /> Refunded to wallet</span>
                                    )}
                                </div>
                                <div className="footer-actions">
                                    {['PENDING', 'CONFIRMED'].includes(appointment.status) && (
                                        <button
                                            className={`btn-action danger ${!cancelEligibility.canCancel ? 'disabled' : ''}`}
                                            onClick={() => handleCancelAppointment(appointment)}
                                            disabled={!cancelEligibility.canCancel}
                                            title={cancelEligibility.reason}
                                        >
                                            <FiXCircle /> Cancel Booking
                                        </button>
                                    )}
                                    {appointment.status === 'COMPLETED' && (
                                        <button className="btn-action primary">Review Service</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomerBookingHistory;
