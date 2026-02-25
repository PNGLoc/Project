import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../lib/axios';
import '../../assets/css/BookingHistory.css';

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
                setItems(res.data?.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load booking history.');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

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
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookingHistory;
