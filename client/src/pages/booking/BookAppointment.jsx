import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../lib/axios';
import '../../assets/css/BookAppointment.css';

const steps = [
    { label: 'Select Salon', sub: 'Choose your place' },
    { label: 'Select Service', sub: 'Pick what you want' },
    { label: 'Select Stylist', sub: 'Choose your expert' },
    { label: 'Date & Time', sub: 'Book a slot' },
    { label: 'Review & Pay', sub: 'Confirm details' }
];

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

const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return `${new Intl.NumberFormat('vi-VN').format(value)} VND`;
};

const BookAppointment = () => {
    const [stepIndex, setStepIndex] = useState(0);
    const [salons, setSalons] = useState([]);
    const [services, setServices] = useState([]);
    const [staffs, setStaffs] = useState([]);
    const [selectedSalon, setSelectedSalon] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [note, setNote] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [bookedSlots, setBookedSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const isBooked = Boolean(success);

    const timeSlots = useMemo(() => buildTimeSlots(9, 19, 30), []);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    useEffect(() => {
        const fetchSalons = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await axiosClient.get('/api/salons');
                setSalons(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load salons.');
            } finally {
                setLoading(false);
            }
        };

        fetchSalons();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const vnpayStatus = params.get('vnpay');
        const appointmentId = params.get('appointmentId');
        if (vnpayStatus) {
            if (vnpayStatus === 'success') {
                setSuccess(`Payment successful. Appointment ID: ${appointmentId || 'N/A'}.`);
                setStepIndex(4);
            } else {
                setError('VNPay payment failed or was cancelled. Please try again.');
                setStepIndex(4);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!selectedSalon?._id) return;
            setLoading(true);
            setError('');
            try {
                const [serviceRes, staffRes] = await Promise.all([
                    axiosClient.get(`/api/services/salon/${selectedSalon._id}`),
                    axiosClient.get(`/api/staffs/public/${selectedSalon._id}`)
                ]);

                setServices(serviceRes.data?.data || []);
                setStaffs(staffRes.data?.data || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load salon details.');
            } finally {
                setLoading(false);
            }
        };

        fetchDetails();
    }, [selectedSalon]);

    useEffect(() => {
        const fetchAvailability = async () => {
            if (!selectedStaff?._id || !selectedDate) {
                setBookedSlots([]);
                return;
            }

            try {
                const res = await axiosClient.get('/api/appointments/availability', {
                    params: { staffId: selectedStaff._id, date: selectedDate }
                });
                setBookedSlots(res.data?.data || []);
            } catch (err) {
                setBookedSlots([]);
            }
        };

        fetchAvailability();
    }, [selectedStaff, selectedDate]);

    useEffect(() => {
        if (selectedTime && isSlotUnavailable(selectedTime)) {
            setSelectedTime('');
        }
    }, [bookedSlots, selectedTime, selectedService, selectedDate]);

    const resetBooking = () => {
        setSelectedSalon(null);
        setSelectedService(null);
        setSelectedStaff(null);
        setServices([]);
        setStaffs([]);
        setSelectedDate('');
        setSelectedTime('');
        setNote('');
        setPaymentMethod('CASH');
        setBookedSlots([]);
        setSuccess('');
        setStepIndex(0);
    };

    const isSlotUnavailable = (slot) => {
        if (!selectedDate || !selectedService?.duration) return false;
        const slotStart = new Date(`${selectedDate}T${slot}`);
        const slotEnd = new Date(slotStart.getTime() + selectedService.duration * 60000);

        return bookedSlots.some((item) => {
            const startAt = new Date(item.startAt);
            const endAt = new Date(item.endAt);
            return slotStart < endAt && slotEnd > startAt;
        });
    };

    const handleNext = () => {
        setError('');
        if (stepIndex === 0 && !selectedSalon) {
            return setError('Please select a salon to continue.');
        }
        if (stepIndex === 1 && !selectedService) {
            return setError('Please select a service to continue.');
        }
        if (stepIndex === 2 && !selectedStaff) {
            return setError('Please select a stylist to continue.');
        }
        if (stepIndex === 3 && (!selectedDate || !selectedTime)) {
            return setError('Please select date and time to continue.');
        }
        setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    };

    const handleBack = () => {
        setError('');
        setStepIndex((prev) => Math.max(prev - 1, 0));
    };

    const handleSubmit = async () => {
        if (!selectedSalon || !selectedService || !selectedStaff || !selectedDate || !selectedTime) {
            return setError('Please complete all steps before paying.');
        }

        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const startAt = new Date(`${selectedDate}T${selectedTime}`).toISOString();
            const response = await axiosClient.post('/api/appointments', {
                salonId: selectedSalon._id,
                serviceId: selectedService._id,
                staffId: selectedStaff._id,
                startAt,
                note,
                paymentMethod
            });

            if (paymentMethod === 'VNPAY') {
                const paymentUrl = response.data?.paymentUrl;
                if (paymentUrl) {
                    window.location.href = paymentUrl;
                    return;
                }
                setError('Unable to start VNPay payment. Please try again.');
            } else {
                setSuccess('Your appointment has been booked successfully.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Booking failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderSalonStep = () => (
        <>
            <h2 className="section-title">Pick a salon</h2>
            <p className="section-subtitle">Select an approved salon to get started.</p>
            {loading ? (
                <p>Loading salons...</p>
            ) : (
                <div className="selection-grid">
                    {salons.map((salon) => (
                        <div
                            key={salon._id}
                            className={`select-card ${selectedSalon?._id === salon._id ? 'selected' : ''}`}
                            onClick={() => {
                                setSelectedSalon(salon);
                                setSelectedService(null);
                                setSelectedStaff(null);
                                setServices([]);
                                setStaffs([]);
                                setSelectedDate('');
                                setSelectedTime('');
                                setSuccess('');
                                setPaymentMethod('CASH');
                                setBookedSlots([]);
                            }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    setSelectedSalon(salon);
                                }
                            }}
                        >
                            <div className="card-title">{salon.name}</div>
                            <div className="card-meta">{salon.address?.district || 'Ho Chi Minh City'}</div>
                            <div className="card-meta">{salon.address?.street || 'Full address available after selection'}</div>
                            <div className="card-tags">
                                <span className="card-tag">Verified</span>
                                <span className="card-tag">Hair & Spa</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );

    const renderServiceStep = () => (
        <>
            <h2 className="section-title">Choose a service</h2>
            <p className="section-subtitle">Select the treatment you want.</p>
            {loading ? (
                <p>Loading services...</p>
            ) : (
                <div className="selection-grid">
                    {services.length === 0 ? (
                        <p>No services available for this salon.</p>
                    ) : (
                        services.map((service) => (
                            <div
                                key={service._id}
                                className={`select-card ${selectedService?._id === service._id ? 'selected' : ''}`}
                                onClick={() => setSelectedService(service)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        setSelectedService(service);
                                    }
                                }}
                            >
                                <div className="card-title">{service.name}</div>
                                <div className="card-meta">{service.description || 'Premium salon service'}</div>
                                <div className="card-meta">Duration: {service.duration} min</div>
                                <div className="card-price">{formatCurrency(service.price)}</div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );

    const renderStaffStep = () => (
        <>
            <h2 className="section-title">Pick your stylist</h2>
            <p className="section-subtitle">Choose a stylist that matches your vibe.</p>
            {loading ? (
                <p>Loading stylists...</p>
            ) : (
                <div className="selection-grid">
                    {staffs.length === 0 ? (
                        <p>No stylists available for this salon.</p>
                    ) : (
                        staffs.map((staff) => (
                            <div
                                key={staff._id}
                                className={`select-card ${selectedStaff?._id === staff._id ? 'selected' : ''}`}
                                onClick={() => setSelectedStaff(staff)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        setSelectedStaff(staff);
                                    }
                                }}
                            >
                                <div className="card-title">{staff.fullName}</div>
                                <div className="card-meta">Stylist</div>
                                <div className="card-tags">
                                    {(staff.skills || []).slice(0, 3).map((skill) => (
                                        <span key={skill._id || skill.name} className="card-tag">
                                            {skill.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </>
    );

    const renderDateStep = () => (
        <>
            <h2 className="section-title">Select date & time</h2>
            <p className="section-subtitle">Pick a slot that works for you.</p>
            <div className="form-row">
                <label className="input-field">
                    Date
                    <input
                        type="date"
                        min={today}
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                    />
                </label>
                <label className="input-field">
                    Note for stylist (optional)
                    <textarea
                        rows={3}
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Anything they should know?"
                    />
                </label>
            </div>
            <div className="time-grid">
                {timeSlots.map((slot) => {
                    const isUnavailable = isSlotUnavailable(slot);
                    return (
                        <button
                            type="button"
                            key={slot}
                            className={`time-slot ${selectedTime === slot ? 'selected' : ''} ${isUnavailable ? 'disabled' : ''}`}
                            onClick={() => setSelectedTime(slot)}
                            disabled={isUnavailable}
                        >
                            {slot}
                        </button>
                    );
                })}
            </div>
        </>
    );

    const renderReviewStep = () => (
        <>
            <h2 className="section-title">Review & Pay</h2>
            <p className="section-subtitle">Confirm the details and choose your payment method.</p>
            <div className="summary-grid">
                <div className="summary-item">
                    <span>Salon</span>
                    <span>{selectedSalon?.name}</span>
                </div>
                <div className="summary-item">
                    <span>Service</span>
                    <span>{selectedService?.name}</span>
                </div>
                <div className="summary-item">
                    <span>Stylist</span>
                    <span>{selectedStaff?.fullName}</span>
                </div>
                <div className="summary-item">
                    <span>Schedule</span>
                    <span>{selectedDate} at {selectedTime}</span>
                </div>
                <div className="summary-item summary-total">
                    <span>Total</span>
                    <span>{formatCurrency(selectedService?.price)}</span>
                </div>
            </div>
            <div className="payment-options">
                <button
                    type="button"
                    className={`payment-card ${paymentMethod === 'CASH' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('CASH')}
                >
                    <div className="payment-title">Pay at salon</div>
                    <div className="payment-sub">Cash payment when you arrive.</div>
                </button>
                <button
                    type="button"
                    className={`payment-card ${paymentMethod === 'VNPAY' ? 'selected' : ''}`}
                    onClick={() => setPaymentMethod('VNPAY')}
                >
                    <div className="payment-title">Pay online with VNPay</div>
                    <div className="payment-sub">VNPay sandbox for testing.</div>
                </button>
            </div>
        </>
    );

    return (
        <div className="booking-page">
            <section className="booking-hero">
                <div className="hero-text">
                    <h1>Book your next appointment</h1>
                    <p>Move through a curated flow: select a salon, choose a service, pick a stylist, lock the time, and finish with a quick pay.</p>
                    <div className="hero-badges">
                        <span className="hero-badge">Instant booking</span>
                        <span className="hero-badge">Verified salons</span>
                        <span className="hero-badge">Pay in one tap</span>
                    </div>
                </div>
                <div className="hero-progress">
                    <div className="booking-steps">
                        {steps.map((step, index) => (
                            <div
                                key={step.label}
                                className={`step-pill ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'done' : ''}`}
                            >
                                <div className="step-index">{index + 1}</div>
                                <div>
                                    <div className="step-title">{step.label}</div>
                                    <div className="step-sub">{step.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="booking-card">
                {stepIndex === 0 && renderSalonStep()}
                {stepIndex === 1 && renderServiceStep()}
                {stepIndex === 2 && renderStaffStep()}
                {stepIndex === 3 && renderDateStep()}
                {stepIndex === 4 && renderReviewStep()}

                {error && <div className="inline-alert">{error}</div>}
                {success && (
                    <div className="inline-success">
                        {success} <button type="button" className="btn-secondary" onClick={resetBooking}>Book another</button>
                    </div>
                )}

                <div className="booking-actions">
                    <button type="button" className="btn-secondary" onClick={handleBack} disabled={stepIndex === 0}>
                        Back
                    </button>
                    {stepIndex < steps.length - 1 ? (
                        <button type="button" className="btn-primary" onClick={handleNext}>
                            Next
                        </button>
                    ) : (
                        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting || isBooked}>
                            {submitting ? 'Processing...' : isBooked ? 'Booked' : paymentMethod === 'VNPAY' ? 'Pay with VNPay' : 'Book (Pay at salon)'}
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
};

export default BookAppointment;
