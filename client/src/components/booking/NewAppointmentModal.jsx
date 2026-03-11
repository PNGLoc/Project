import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import './NewAppointmentModal.css';

const WALK_IN_VALUE = 'WALK_IN';

const buildTimeSlots = (startHour, endHour, intervalMinutes) => {
    const slots = [];
    for (let hour = startHour; hour <= endHour; hour += 1) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
            if (hour === endHour && minute > 0) break;
            const hh = String(hour).padStart(2, '0');
            const mm = String(minute).padStart(2, '0');
            slots.push(`${hh}:${mm}`);
        }
    }
    return slots;
};

const calculateDiscount = (coupon, amount) => {
    if (!coupon || amount <= 0) return 0;

    if (coupon.discountType === 'PERCENTAGE') {
        const rawDiscount = (amount * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
            return Math.max(0, Math.min(rawDiscount, coupon.maxDiscountAmount));
        }
        return Math.max(0, rawDiscount);
    }

    return Math.max(0, coupon.discountValue || 0);
};

const NewAppointmentModal = ({ isOpen, onClose, onCreated }) => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [services, setServices] = useState([]);
    const [search, setSearch] = useState('');
    const [bookedSlots, setBookedSlots] = useState([]);
    const [customerCoupons, setCustomerCoupons] = useState([]);
    const [couponsLoading, setCouponsLoading] = useState(false);
    const [form, setForm] = useState({
        customerId: '',
        guestName: '',
        serviceId: '',
        staffId: '',
        date: '',
        time: '',
        note: '',
        collectedCouponId: ''
    });

    const timeSlots = useMemo(() => buildTimeSlots(9, 19, 30), []);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    const isStaffUser = user?.role === 'STAFF';

    const selectedService = useMemo(
        () => services.find((item) => item._id === form.serviceId),
        [services, form.serviceId]
    );

    const isWalkIn = form.customerId === WALK_IN_VALUE;

    const selectedCouponEntry = useMemo(
        () => customerCoupons.find((item) => item.collectedCouponId === form.collectedCouponId),
        [customerCoupons, form.collectedCouponId]
    );

    const pricing = useMemo(() => {
        const basePrice = Number(selectedService?.price || 0);
        const coupon = selectedCouponEntry?.coupon;

        if (!coupon) {
            return {
                basePrice,
                discount: 0,
                total: basePrice,
                isCouponEligible: true
            };
        }

        const minPurchase = Number(coupon.minPurchaseAmount || 0);
        const isCouponEligible = basePrice >= minPurchase;
        const discount = isCouponEligible ? Math.min(basePrice, calculateDiscount(coupon, basePrice)) : 0;

        return {
            basePrice,
            discount,
            total: Math.max(0, basePrice - discount),
            isCouponEligible
        };
    }, [selectedService, selectedCouponEntry]);

    const finalAmount = pricing.total;

    const resetForm = () => {
        setForm({
            customerId: '',
            guestName: '',
            serviceId: '',
            staffId: '',
            date: '',
            time: '',
            note: '',
            collectedCouponId: ''
        });
        setSearch('');
        setBookedSlots([]);
        setCustomerCoupons([]);
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

    useEffect(() => {
        if (!isOpen) return;

        if (!form.staffId || !form.date) {
            setBookedSlots([]);
            return;
        }

        axiosClient
            .get('/api/appointments/availability', {
                params: {
                    staffId: form.staffId,
                    date: form.date
                }
            })
            .then((res) => setBookedSlots(res.data?.data || []))
            .catch(() => setBookedSlots([]));
    }, [form.staffId, form.date, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        if (!form.customerId || isWalkIn) {
            setCustomerCoupons([]);
            setForm((prev) => ({ ...prev, collectedCouponId: '' }));
            return;
        }

        setCouponsLoading(true);
        axiosClient
            .get(`/api/appointments/provider-customers/${form.customerId}/coupons`)
            .then((res) => {
                setCustomerCoupons(res.data?.data || []);
            })
            .catch(() => {
                setCustomerCoupons([]);
            })
            .finally(() => {
                setCouponsLoading(false);
            });
    }, [form.customerId, isWalkIn, isOpen]);

    useEffect(() => {
        if (!form.time) return;

        const selectedTimeStillAvailable = !isSlotUnavailable(form.time);
        if (!selectedTimeStillAvailable) {
            setForm((prev) => ({ ...prev, time: '' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookedSlots, form.date, form.staffId, form.serviceId]);

    useEffect(() => {
        if (!form.collectedCouponId) return;

        const exists = customerCoupons.some((item) => item.collectedCouponId === form.collectedCouponId);
        if (!exists || !pricing.isCouponEligible) {
            setForm((prev) => ({ ...prev, collectedCouponId: '' }));
        }
    }, [customerCoupons, form.collectedCouponId, pricing.isCouponEligible]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const isSlotUnavailable = (slot) => {
        if (!form.date || !selectedService?.duration) return false;

        const slotStart = new Date(`${form.date}T${slot}`);
        const slotEnd = new Date(slotStart.getTime() + selectedService.duration * 60000);

        const hasConflict = bookedSlots.some((item) => {
            const startAt = new Date(item.startAt);
            const endAt = new Date(item.endAt);
            return slotStart < endAt && slotEnd > startAt;
        });

        if (hasConflict) return true;

        const now = new Date();
        if (form.date === today && slotStart < now) {
            return true;
        }

        return false;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.staffId || !form.serviceId || !form.date || !form.time) {
            toast.warning('Please complete all required fields.');
            return;
        }

        if (isWalkIn && !String(form.guestName || '').trim()) {
            toast.warning('Please enter guest name for walk-in appointment.');
            return;
        }

        if (!isWalkIn && !form.customerId) {
            toast.warning('Please select a customer.');
            return;
        }

        const startAt = new Date(`${form.date}T${form.time}`);
        if (Number.isNaN(startAt.getTime()) || startAt.getTime() < Date.now()) {
            toast.warning('Please select a valid future date/time.');
            return;
        }

        try {
            setSubmitting(true);

            const payload = {
                serviceId: form.serviceId,
                staffId: form.staffId,
                startAt: startAt.toISOString(),
                note: form.note
            };

            if (isWalkIn) {
                payload.customerId = WALK_IN_VALUE;
                payload.guestName = String(form.guestName || '').trim();
            } else {
                payload.customerId = form.customerId;

                if (form.collectedCouponId && pricing.isCouponEligible) {
                    payload.collectedCouponId = form.collectedCouponId;
                }
            }

            await axiosClient.post('/api/appointments/provider', payload);

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
                        <div className="new-apt-layout">
                            <div className="new-apt-left">
                                <div className="new-apt-grid">
                                    <label>
                                        Customer
                                        <select name="customerId" value={form.customerId} onChange={handleChange} required>
                                            <option value="">Select customer</option>
                                            <option value={WALK_IN_VALUE}>Guest</option>
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
                                            disabled={isWalkIn}
                                            onChange={(event) => setSearch(event.target.value)}
                                        />
                                    </label>

                                    {isWalkIn && (
                                        <label>
                                            Walk-in guest name
                                            <input
                                                type="text"
                                                name="guestName"
                                                value={form.guestName}
                                                onChange={handleChange}
                                                placeholder="Enter guest full name"
                                                required={isWalkIn}
                                            />
                                        </label>
                                    )}

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
                                        <input type="date" min={today} name="date" value={form.date} onChange={handleChange} required />
                                    </label>
                                </div>

                                <div className="new-apt-slots">
                                    <div className="new-apt-slots-header">Select time slot</div>
                                    <div className="new-apt-time-grid">
                                        {timeSlots.map((slot) => {
                                            const isUnavailable = isSlotUnavailable(slot);
                                            return (
                                                <button
                                                    key={slot}
                                                    type="button"
                                                    className={`new-apt-time-slot ${form.time === slot ? 'selected' : ''}`}
                                                    disabled={isUnavailable || !form.date || !selectedService || !form.staffId}
                                                    onClick={() => setForm((prev) => ({ ...prev, time: slot }))}
                                                >
                                                    {slot}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {!form.date && <div className="new-apt-hint">Please select a date first.</div>}
                                </div>

                                <div className="new-apt-coupon-block">
                                    <label>
                                        Apply collected coupon
                                        <select
                                            name="collectedCouponId"
                                            value={form.collectedCouponId}
                                            onChange={handleChange}
                                            disabled={isWalkIn || !form.customerId || couponsLoading || customerCoupons.length === 0}
                                        >
                                            <option value="">No coupon</option>
                                            {customerCoupons.map((item) => {
                                                const coupon = item.coupon;
                                                const minPurchase = Number(coupon.minPurchaseAmount || 0);
                                                const notEligible = Number(selectedService?.price || 0) < minPurchase;
                                                return (
                                                    <option key={item.collectedCouponId} value={item.collectedCouponId} disabled={notEligible}>
                                                        {coupon.code} - {coupon.discountType === 'PERCENTAGE'
                                                            ? `${coupon.discountValue}%`
                                                            : `${Number(coupon.discountValue || 0).toLocaleString('vi-VN')} VND`}
                                                        {notEligible ? ` (Min ${minPurchase.toLocaleString('vi-VN')} VND)` : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </label>
                                    {couponsLoading && <div className="new-apt-hint">Loading coupons...</div>}
                                    {!couponsLoading && !isWalkIn && form.customerId && customerCoupons.length === 0 && (
                                        <div className="new-apt-hint">No available collected coupons for this customer.</div>
                                    )}
                                </div>

                            </div>

                            <div className="new-apt-right">
                                <label className="new-apt-note-block">
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
                                    <span>Original</span>
                                    <strong>{Number(pricing.basePrice || 0).toLocaleString('vi-VN')} VND</strong>
                                </div>

                                <div className="new-apt-summary">
                                    <span>Discount</span>
                                    <strong>- {Number(pricing.discount || 0).toLocaleString('vi-VN')} VND</strong>
                                </div>

                                <div className="new-apt-summary">
                                    <span>Total</span>
                                    <strong>{Number(finalAmount || 0).toLocaleString('vi-VN')} VND</strong>
                                </div>
                            </div>
                        </div>

                        <div className="new-apt-actions">
                            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-submit" disabled={submitting}>
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
