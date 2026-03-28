import React, { useState, useEffect } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import ConfirmModal from '../ui/ConfirmModal';
import './AppointmentModal.css';

const AppointmentModal = ({ isOpen, onClose, appointmentId, onUpdateSuccess }) => {
    const [appointment, setAppointment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState(false);

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Editable fields
    const [status, setStatus] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    // Auth State
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isStaff = currentUser?.role === 'STAFF';

    const getClientDisplayName = (appointmentData) => {
        const customerFullName = String(appointmentData?.customerId?.fullName || '').trim();
        const guestFullName = String(appointmentData?.guestInfo?.fullName || '').trim();

        if (guestFullName && customerFullName) {
            return `${customerFullName} (${guestFullName})`;
        }

        if (guestFullName) {
            return guestFullName;
        }

        if (customerFullName) {
            return customerFullName;
        }

        return 'Guest';
    };

    useEffect(() => {
        if (isOpen && appointmentId) {
            fetchAppointmentDetails();
        } else {
            // Reset state when closed
            setAppointment(null);
            setStatus('');
            setNote('');
            setError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, appointmentId]);

    const fetchAppointmentDetails = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await axiosClient.get(`/api/appointments/${appointmentId}`);
            const data = response.data?.data;
            setAppointment(data);
            setStatus(data.status);
            setNote(data.note || '');
        } catch (err) {
            console.error('Failed to view appointment details', err);
            setError('Could not load appointment details.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            setUpdating(true);
            setError('');
            await axiosClient.put(`/api/appointments/${appointmentId}`, {
                status,
                note
            });
            onUpdateSuccess();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update schedule.');
        } finally {
            setUpdating(false);
        }
    };

    const handleDelete = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Cancel Appointment',
            message: 'Are you sure you want to completely cancel and remove this appointment?',
            onConfirm: async () => {
                try {
                    setUpdating(true);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    await axiosClient.delete(`/api/appointments/${appointmentId}`);
                    toast.success('Appointment cancelled successfully');
                    onUpdateSuccess();
                    onClose();
                } catch (err) {
                    console.error('Delete error:', err);
                    setError(err.response?.data?.message || 'Failed to delete schedule.');
                } finally {
                    setUpdating(false);
                }
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="admin-modal-backdrop">
            <div className="admin-modal" style={{ maxWidth: '500px' }}>
                <div className="admin-modal-header">
                    <h3>Schedule Details</h3>
                    <button className="admin-modal-close" onClick={onClose}>
                        &times;
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">Loading schedule details...</div>
                ) : error && !appointment ? (
                    <div className="error-message">{error}</div>
                ) : appointment ? (
                    <form onSubmit={handleUpdate}>

                        {/* Summary Section */}
                        <div className="detail-grid" style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px', marginBottom: '20px' }}>
                            <div className="detail-row">
                                <span className="label">Client Name</span>
                                <span className="value">{getClientDisplayName(appointment)}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Service</span>
                                <span className="value">{appointment.serviceSnapshot?.name || 'Service'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Stylist</span>
                                <span className="value">{appointment.staffId?.fullName || appointment.staffSnapshot?.fullName || 'Stylist'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Date</span>
                                <span className="value">
                                    {new Date(appointment.startAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Time</span>
                                <span className="value">
                                    {new Date(appointment.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {' - '}
                                    {new Date(appointment.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="label">Price</span>
                                <span className="value" style={{ color: '#008080', fontWeight: '700' }}>
                                    {appointment.totalPrice?.toLocaleString()} VND
                                </span>
                            </div>
                        </div>

                        {/* Editable Fields */}
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Status</label>
                            <select
                                className="form-control"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                disabled={updating || isStaff}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Provider Note</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Add notes for this appointment..."
                                disabled={updating || isStaff}
                                style={{ resize: 'vertical' }}
                            ></textarea>
                        </div>

                        {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                             {!isStaff ? (
                                <button
                                    type="button"
                                    className="btn-reject-rose"
                                    onClick={handleDelete}
                                    disabled={updating}
                                >
                                    Delete Schedule
                                </button>
                            ) : (
                                <div></div> /* Empty div to maintain flex alignment */
                            )}

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button type="button" className="btn-outline" onClick={onClose} disabled={updating}>{isStaff ? 'Close' : 'Cancel'}</button>
                                {!isStaff && (
                                    <button type="submit" className="btn-approve-teal" disabled={updating}>
                                        {updating ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>
                ) : null}

                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                    confirmText="Cancel Appointment"
                    type="danger"
                />
            </div>
        </div>
    );
};

export default AppointmentModal;
