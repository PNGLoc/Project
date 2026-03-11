import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../lib/axios';
import '../../assets/css/BookingHistory.css';

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

const BookingHistory = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axiosClient.get('/api/appointments/my');
                const sorted = [...(res.data?.data || [])].sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.startAt || 0).getTime();
                    const timeB = new Date(b.createdAt || b.startAt || 0).getTime();
                    return timeB - timeA;
                });
                setItems(sorted);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load booking history.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const canCancel = (startAt, status) => {
        if (!['PENDING', 'CONFIRMED'].includes(status)) return false;
        const startTime = new Date(startAt).getTime();
        return startTime >= Date.now() + CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;
    };

    const handleCancel = async (appointmentId) => {
        if (!window.confirm('Are you sure you want to cancel this booking?')) return;

        try {
            await axiosClient.patch(`/api/appointments/${appointmentId}/cancel`);
            setItems((prev) => prev.map((item) => (
                item._id === appointmentId
                    ? { ...item, status: 'CANCELLED' }
                    : item
            )));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel booking.');
        }
    };

    return (
        <div className="booking-history-page">
            <div className="booking-history-hero">
                <div>
                    <h1>My booking history</h1>
                    <p>Review your past and upcoming appointments in one place.</p>
                </div>
                <Link to="/book-appointment" className="history-cta">
                    Book new appointment
                </Link>
            </div>

            {loading && <p className="history-status">Loading bookings...</p>}
            {error && <p className="history-status error">{error}</p>}

            {!loading && !error && items.length === 0 && (
                <div className="history-empty">
                    <p>No appointments yet.</p>
                    <Link to="/book-appointment">Book your first appointment</Link>
                </div>
            )}

            <div className="history-grid">
                {items.map((item) => (
                    <div className="history-card" key={item._id}>
                        <div className="history-header">
                            <div>
                                <div className="history-salon">{item.salonId?.name || 'Salon'}</div>
                                <div className="history-meta">{item.serviceSnapshot?.name || 'Service'}</div>
                            </div>
                            <div className={`history-status-pill ${item.status?.toLowerCase()}`}>
                                {item.status}
                            </div>
                        </div>

                        <div className="history-details">
                            <div>
                                <span>Booked at</span>
                                <strong>{formatDateTime(item.createdAt)}</strong>
                            </div>
                            <div>
                                <span>Date & time</span>
                                <strong>{formatDateTime(item.startAt)}</strong>
                            </div>
                            <div>
                                <span>Stylist</span>
                                <strong>{item.staffSnapshot?.fullName || 'Stylist'}</strong>
                            </div>
                            <div>
                                <span>Payment</span>
                                <strong>{item.paymentMethod} - {item.paymentStatus}</strong>
                            </div>
                            <div>
                                <span>Total</span>
                                <strong>{formatCurrency(item.totalPrice)}</strong>
                            </div>
                        </div>

                        {canCancel(item.startAt, item.status) && (
                            <div style={{ marginTop: '12px' }}>
                                <button
                                    type="button"
                                    className="btn-action danger"
                                    onClick={() => handleCancel(item._id)}
                                >
                                    Cancel booking
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookingHistory;
