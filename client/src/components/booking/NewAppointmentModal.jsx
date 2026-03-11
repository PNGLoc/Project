import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import './NewAppointmentModal.css';

const NewAppointmentModal = ({ isOpen, onClose, onCreated }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [services, setServices] = useState([]);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({
        customerId: '',
        serviceId: '',
        staffId: '',
        date: '',
        time: '',
        paymentMethod: 'CASH',
        note: ''
    });

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    const isStaffUser = user?.role === 'STAFF';

    const selectedCustomer = useMemo(
        () => customers.find((item) => item._id === form.customerId),
        [customers, form.customerId]
    );

    const selectedService = useMemo(
        () => services.find((item) => item._id === form.serviceId),
        [services, form.serviceId]
    );

    const finalAmount = Number(selectedService?.price || 0);
    const isWalletInsufficient = form.paymentMethod === 'WALLET' && Number(selectedCustomer?.walletBalance || 0) < finalAmount;

    const resetForm = () => {
        setForm({
            customerId: '',
            serviceId: '',
            staffId: '',
            date: '',
            time: '',
            paymentMethod: 'CASH',
            note: ''
        });
        setSearch('');
    };

    const fetchCustomers = async (q = '') => {
        const res = await axiosClient.get('/api/appointments/provider-customers', {
            params: q ? { q } : undefined
        });
        setCustomers(res.data?.data || []);
    };

    const fetchBootstrapData = async () => {
        try {
            setLoading(true);
            await fetchCustomers('');

            if (isStaffUser) {
                const meRes = await axiosClient.get('/api/staffs/me');
                const staffData = meRes.data?.data || [];
                setStaffs(staffData);

                const myStaff = staffData[0];
                if (myStaff?._id) {
                    setForm((prev) => ({ ...prev, staffId: myStaff._id }));
                }

                const salonId = myStaff?.salonId;
                if (salonId) {
                    const serviceRes = await axiosClient.get(`/api/services/salon/${salonId}`);
                    setServices(serviceRes.data?.data || []);
                } else {
                    setServices([]);
                }
            } else {
                const [staffRes, serviceRes] = await Promise.all([
                    axiosClient.get('/api/staffs'),
                    axiosClient.get('/api/services/owner')
                ]);

                setStaffs(staffRes.data?.data || []);
                setServices(serviceRes.data?.data || []);
            }
        } catch (error) {
            console.error('[NEW APPOINTMENT MODAL]', error);
            toast.error(error.response?.data?.message || 'Failed to load booking form data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        resetForm();
        fetchBootstrapData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            fetchCustomers(search).catch(() => null);
        }, 350);

        return () => clearTimeout(timer);
    }, [search, isOpen]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.customerId || !form.staffId || !form.serviceId || !form.date || !form.time) {
            toast.warning('Please complete all required fields.');
            return;
        }

        if (isWalletInsufficient) {
            toast.warning('Customer wallet balance is insufficient for this service.');
            return;
        }

        const startAt = new Date(`${form.date}T${form.time}`);
        if (Number.isNaN(startAt.getTime()) || startAt.getTime() < Date.now()) {
            toast.warning('Please select a valid future date/time.');
            return;
        }

        try {
            setSubmitting(true);

            await axiosClient.post('/api/appointments/provider', {
                customerId: form.customerId,
                serviceId: form.serviceId,
                staffId: form.staffId,
                startAt: startAt.toISOString(),
                paymentMethod: form.paymentMethod,
                note: form.note
            });

            toast.success('Appointment created and confirmed successfully.');
            onCreated?.();
            onClose?.();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create appointment.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="new-apt-overlay" onClick={onClose}>
            <div className="new-apt-modal" onClick={(event) => event.stopPropagation()}>
                <div className="new-apt-header">
                    <h3>Create New Appointment</h3>
                    <button type="button" onClick={onClose} className="new-apt-close">&times;</button>
                </div>

                {loading ? (
                    <div className="new-apt-loading">Loading form data...</div>
                ) : (
                    <form onSubmit={handleSubmit} className="new-apt-form">
                        <div className="new-apt-grid">
                            <label>
                                Customer
                                <select name="customerId" value={form.customerId} onChange={handleChange} required>
                                    <option value="">Select customer</option>
                                    {customers.map((customer) => (
                                        <option key={customer._id} value={customer._id}>
                                            {customer.fullName} - {customer.phone || customer.email}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Search customer
                                <input
                                    type="text"
                                    value={search}
                                    placeholder="Name, email or phone"
                                    onChange={(event) => setSearch(event.target.value)}
                                />
                            </label>

                            <label>
                                Service
                                <select name="serviceId" value={form.serviceId} onChange={handleChange} required>
                                    <option value="">Select service</option>
                                    {services.map((service) => (
                                        <option key={service._id} value={service._id}>
                                            {service.name} - {Number(service.price || 0).toLocaleString('vi-VN')} VND
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Staff
                                <select
                                    name="staffId"
                                    value={form.staffId}
                                    onChange={handleChange}
                                    required
                                    disabled={isStaffUser}
                                >
                                    <option value="">Select staff</option>
                                    {staffs.map((staff) => (
                                        <option key={staff._id} value={staff._id}>
                                            {staff.fullName}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Date
                                <input type="date" name="date" value={form.date} onChange={handleChange} required />
                            </label>

                            <label>
                                Time
                                <input type="time" name="time" value={form.time} onChange={handleChange} required />
                            </label>
                        </div>

                        <div className="new-apt-payment">
                            <span>Payment</span>
                            <div className="new-apt-payment-options">
                                <button
                                    type="button"
                                    className={`pay-option ${form.paymentMethod === 'CASH' ? 'active' : ''}`}
                                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'CASH' }))}
                                >
                                    CASH
                                </button>
                                <button
                                    type="button"
                                    className={`pay-option ${form.paymentMethod === 'WALLET' ? 'active' : ''}`}
                                    onClick={() => setForm((prev) => ({ ...prev, paymentMethod: 'WALLET' }))}
                                >
                                    WALLET
                                </button>
                            </div>
                            {selectedCustomer && (
                                <div className="new-apt-wallet-hint">
                                    Customer wallet: {Number(selectedCustomer.walletBalance || 0).toLocaleString('vi-VN')} VND
                                </div>
                            )}
                            {isWalletInsufficient && (
                                <div className="new-apt-error">Wallet balance is insufficient for this payment method.</div>
                            )}
                        </div>

                        <label>
                            Provider note
                            <textarea
                                name="note"
                                rows="3"
                                placeholder="Optional note"
                                value={form.note}
                                onChange={handleChange}
                            />
                        </label>

                        <div className="new-apt-summary">
                            <span>Total</span>
                            <strong>{finalAmount.toLocaleString('vi-VN')} VND</strong>
                        </div>

                        <div className="new-apt-actions">
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit" disabled={submitting || isWalletInsufficient}>
                                {submitting ? 'Creating...' : 'Create & Confirm'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default NewAppointmentModal;
