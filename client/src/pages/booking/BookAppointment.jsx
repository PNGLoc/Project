import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axiosClient from '../../lib/axios';
import userCouponApi from '../../features/coupon/api/userCouponApi';
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

const DRAFT_KEY = 'booking_draft_v1';
const VNPAY_PENDING_KEY = 'vnpay_pending_appointment_id';
const VNPAY_REDIRECTING_KEY = 'vnpay_redirecting';

const getImageUrl = (image) => {
    if (!image) return null;
    let imgPath = Array.isArray(image) ? image[0] : image;
    if (!imgPath) return null;
    if (imgPath.startsWith('http')) return imgPath;
    const sanitizedPath = imgPath.startsWith('/') ? imgPath.substring(1) : imgPath;
    return `http://localhost:5000/${sanitizedPath.replace(/\\/g, '/')}`;
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
    const [selectedCouponId, setSelectedCouponId] = useState('');
    const [bookedSlots, setBookedSlots] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [collectedCoupons, setCollectedCoupons] = useState([]);
    const [salonsLoading, setSalonsLoading] = useState(false);
    const [couponsLoading, setCouponsLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const isBooked = Boolean(success);

    const timeSlots = useMemo(() => buildTimeSlots(9, 19, 30), []);
    const today = useMemo(() => new Date().toISOString().split('T')[0], []);

    useEffect(() => {
        const fetchSalons = async () => {
            setSalonsLoading(true);
            setError('');
            try {
                const res = await axiosClient.get('/api/salons');
                setSalons(Array.isArray(res.data) ? res.data : []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load salons.');
            } finally {
                setSalonsLoading(false);
            }
        };

        fetchSalons();
    }, []);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const parsed = JSON.parse(userStr);
                if (typeof parsed?.walletBalance === 'number') {
                    setWalletBalance(parsed.walletBalance);
                }
            } catch {
                // ignore parse errors
            }
        }

        axiosClient
            .get('/api/auth/profile')
            .then((res) => {
                const balance = Number(res.data?.walletBalance || 0);
                setWalletBalance(balance);

                try {
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    localStorage.setItem('user', JSON.stringify({ ...localUser, walletBalance: balance }));
                } catch {
                    // ignore localStorage parse errors
                }
            })
            .catch(() => null);
    }, []);

    useEffect(() => {
        let isActive = true;

        const fetchCollectedCoupons = async () => {
            try {
                setCouponsLoading(true);
                const data = await userCouponApi.getMyCollectedCoupons({ status: 'available' });
                if (!isActive) return;
                setCollectedCoupons(data.items || []);
            } catch {
                if (!isActive) return;
                setCollectedCoupons([]);
            } finally {
                if (isActive) {
                    setCouponsLoading(false);
                }
            }
        };

        fetchCollectedCoupons();

        return () => {
            isActive = false;
        };
    }, []);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(DRAFT_KEY);
            if (raw) {
                const draft = JSON.parse(raw);
                if (draft?.stepIndex >= 0) setStepIndex(draft.stepIndex);
                if (draft?.selectedSalon) setSelectedSalon(draft.selectedSalon);
                if (draft?.selectedService) setSelectedService(draft.selectedService);
                if (draft?.selectedStaff) setSelectedStaff(draft.selectedStaff);
                if (draft?.selectedDate) setSelectedDate(draft.selectedDate);
                if (draft?.selectedTime) setSelectedTime(draft.selectedTime);
                if (typeof draft?.note === 'string') setNote(draft.note);
                if (draft?.paymentMethod) setPaymentMethod(draft.paymentMethod);
                if (draft?.selectedCouponId) setSelectedCouponId(draft.selectedCouponId);
            }
        } catch {
            sessionStorage.removeItem(DRAFT_KEY);
        }

        const params = new URLSearchParams(window.location.search);
        const vnpayStatus = params.get('vnpay');
        const appointmentId = params.get('appointmentId');
        if (vnpayStatus) {
            if (vnpayStatus === 'success') {
                setSuccess(`Payment successful. Appointment ID: ${appointmentId || 'N/A'}.`);
                setStepIndex(4);
                sessionStorage.removeItem(DRAFT_KEY);
                sessionStorage.removeItem(VNPAY_PENDING_KEY);
                sessionStorage.removeItem(VNPAY_REDIRECTING_KEY);
            } else {
                setError('VNPay payment failed or was cancelled. Please try again.');
                setStepIndex(4);
                sessionStorage.removeItem(VNPAY_PENDING_KEY);
                sessionStorage.removeItem(VNPAY_REDIRECTING_KEY);
            }
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        const pendingId = sessionStorage.getItem(VNPAY_PENDING_KEY);
        const wasRedirecting = sessionStorage.getItem(VNPAY_REDIRECTING_KEY) === '1';
        if (pendingId && wasRedirecting) {
            axiosClient.patch(`/api/appointments/${pendingId}/cancel-vnpay`).catch(() => null).finally(() => {
                sessionStorage.removeItem(VNPAY_PENDING_KEY);
                sessionStorage.removeItem(VNPAY_REDIRECTING_KEY);
            });
            setError('VNPay payment was not completed. Your pending booking has been cancelled.');
        }
    }, []);

    useEffect(() => {
        let isActive = true;

        const fetchDetails = async () => {
            if (!selectedSalon?._id) return;
            setDetailsLoading(true);
            setError('');
            try {
                const [serviceRes, staffRes] = await Promise.all([
                    axiosClient.get(`/api/services/salon/${selectedSalon._id}`),
                    axiosClient.get(`/api/staffs/public/${selectedSalon._id}`)
                ]);

                if (!isActive) return;
                setServices(serviceRes.data?.data || []);
                setStaffs(staffRes.data?.data || []);
            } catch (err) {
                if (isActive) {
                    setError(err.response?.data?.message || 'Failed to load salon details.');
                }
            } finally {
                if (isActive) {
                    setDetailsLoading(false);
                }
            }
        };

        fetchDetails();

        return () => {
            isActive = false;
        };
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

    useEffect(() => {
        const draft = {
            stepIndex,
            selectedSalon,
            selectedService,
            selectedStaff,
            selectedDate,
            selectedTime,
            note,
            paymentMethod,
            selectedCouponId
        };
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, [stepIndex, selectedSalon, selectedService, selectedStaff, selectedDate, selectedTime, note, paymentMethod, selectedCouponId]);

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
        setSelectedCouponId('');
        setBookedSlots([]);
        setSuccess('');
        setStepIndex(0);
        sessionStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(VNPAY_PENDING_KEY);
        sessionStorage.removeItem(VNPAY_REDIRECTING_KEY);
    };

    const handleSelectSalon = useCallback((salon) => {
        if (!salon?._id) return;
        if (selectedSalon?._id === salon._id) return;

        setSelectedSalon(salon);
        setSelectedService(null);
        setSelectedStaff(null);
        setServices([]);
        setStaffs([]);
        setSelectedDate('');
        setSelectedTime('');
        setSuccess('');
        setPaymentMethod('CASH');
        setSelectedCouponId('');
        setBookedSlots([]);
    }, [selectedSalon]);

    const availableSalonCoupons = useMemo(() => {
        if (!selectedSalon?._id) return [];

        const now = Date.now();

        return collectedCoupons.filter((entry) => {
            const coupon = entry?.coupon;
            if (!coupon || entry?.isUsed) return false;

            const couponSalonId = coupon?.salonId?._id || coupon?.salonId;
            if (!couponSalonId || couponSalonId.toString() !== selectedSalon._id.toString()) {
                return false;
            }

            const start = new Date(coupon.startDate).getTime();
            const end = new Date(coupon.endDate).getTime();

            if (!coupon.isActive) return false;
            if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
            if (start > now || end < now) return false;
            if (coupon.usedCount >= coupon.usageLimit) return false;

            return true;
        });
    }, [collectedCoupons, selectedSalon]);

    const selectedCouponEntry = useMemo(
        () => availableSalonCoupons.find((entry) => entry._id === selectedCouponId),
        [availableSalonCoupons, selectedCouponId]
    );

    const pricing = useMemo(() => {
        const basePrice = Number(selectedService?.price || 0);
        if (!selectedCouponEntry?.coupon) {
            return {
                basePrice,
                discount: 0,
                total: basePrice,
                isCouponEligible: true
            };
        }

        const coupon = selectedCouponEntry.coupon;
        const minPurchase = Number(coupon.minPurchaseAmount || 0);
        const isCouponEligible = basePrice >= minPurchase;

        if (!isCouponEligible) {
            return {
                basePrice,
                discount: 0,
                total: basePrice,
                isCouponEligible
            };
        }

        const discount = Math.min(basePrice, calculateDiscount(coupon, basePrice));

        return {
            basePrice,
            discount,
            total: Math.max(0, basePrice - discount),
            isCouponEligible
        };
    }, [selectedService, selectedCouponEntry]);

    useEffect(() => {
        if (!selectedCouponId) return;

        const stillExists = availableSalonCoupons.some((entry) => entry._id === selectedCouponId);
        if (!stillExists || !pricing.isCouponEligible) {
            setSelectedCouponId('');
        }
    }, [selectedCouponId, availableSalonCoupons, pricing.isCouponEligible]);

    useEffect(() => {
        if (paymentMethod === 'WALLET' && walletBalance < pricing.total) {
            setPaymentMethod('CASH');
        }
    }, [paymentMethod, walletBalance, pricing.total]);

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

        if (paymentMethod === 'WALLET' && walletBalance < pricing.total) {
            return setError('Your wallet balance is not enough for this booking.');
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
                paymentMethod,
                collectedCouponId: selectedCouponId || undefined
            });

            if (paymentMethod === 'VNPAY') {
                const paymentUrl = response.data?.paymentUrl;
                const pendingId = response.data?.data?._id;
                if (paymentUrl) {
                    if (pendingId) {
                        sessionStorage.setItem(VNPAY_PENDING_KEY, pendingId);
                    }
                    sessionStorage.setItem(VNPAY_REDIRECTING_KEY, '1');
                    window.location.href = paymentUrl;
                    return;
                }
                setError('Unable to start VNPay payment. Please try again.');
            } else {
                setSuccess('Your appointment has been booked successfully.');
                sessionStorage.removeItem(DRAFT_KEY);

                if (paymentMethod === 'WALLET') {
                    const newBalance = Math.max(0, walletBalance - pricing.total);
                    setWalletBalance(newBalance);

                    try {
                        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                        localStorage.setItem('user', JSON.stringify({ ...localUser, walletBalance: newBalance }));
                    } catch {
                        // ignore localStorage parse errors
                    }
                }
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
            {salonsLoading ? (
                <p>Loading salons...</p>
            ) : (
                <div className="selection-grid">
                    {salons.map((salon) => (
                        <div
                            key={salon._id}
                            className={`select-card ${selectedSalon?._id === salon._id ? 'selected' : ''}`}
                            onClick={() => handleSelectSalon(salon)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    handleSelectSalon(salon);
                                }
                            }}
                        >
                            <div className="card-image" style={{ height: '120px', width: '100%', marginBottom: '12px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                                {getImageUrl(salon.images) ? (
                                    <img src={getImageUrl(salon.images)} alt={salon.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ccc' }}>No Image</div>
                                )}
                            </div>
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
            {detailsLoading ? (
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
            {detailsLoading ? (
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
                <div className="summary-item" style={{ alignItems: 'center' }}>
                    <span>Salon</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getImageUrl(selectedSalon?.images) && (
                            <img 
                                src={getImageUrl(selectedSalon.images)} 
                                alt="Salon" 
                                style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                            />
                        )}
                        <span>{selectedSalon?.name}</span>
                    </div>
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
                    <span>Original price</span>
                    <span>{formatCurrency(pricing.basePrice)}</span>
                </div>
                <div className="summary-item">
                    <span>Coupon discount</span>
                    <span>- {formatCurrency(pricing.discount)}</span>
                </div>
                <div className="summary-item summary-total">
                    <span>Final total</span>
                    <span>{formatCurrency(pricing.total)}</span>
                </div>
            </div>

            <div className="coupon-picker">
                <label htmlFor="coupon-select">Apply collected coupon</label>
                <select
                    id="coupon-select"
                    value={selectedCouponId}
                    onChange={(event) => setSelectedCouponId(event.target.value)}
                    disabled={!selectedSalon || couponsLoading || availableSalonCoupons.length === 0}
                >
                    <option value="">No coupon</option>
                    {availableSalonCoupons.map((entry) => {
                        const coupon = entry.coupon;
                        const minPurchase = Number(coupon.minPurchaseAmount || 0);
                        const notEligible = Number(selectedService?.price || 0) < minPurchase;

                        return (
                            <option key={entry._id} value={entry._id} disabled={notEligible}>
                                {coupon.code} - {coupon.discountType === 'PERCENTAGE'
                                    ? `${coupon.discountValue}%`
                                    : formatCurrency(coupon.discountValue)}
                                {notEligible ? ` (Min ${formatCurrency(minPurchase)})` : ''}
                            </option>
                        );
                    })}
                </select>
                {couponsLoading && <div className="coupon-hint">Loading your coupons...</div>}
                {!couponsLoading && selectedSalon && availableSalonCoupons.length === 0 && (
                    <div className="coupon-hint">No available collected coupons for this salon.</div>
                )}
            </div>

            <div className="wallet-balance">Wallet balance: {formatCurrency(walletBalance)}</div>

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
                <button
                    type="button"
                    className={`payment-card ${paymentMethod === 'WALLET' ? 'selected' : ''} ${walletBalance < pricing.total ? 'disabled' : ''}`}
                    onClick={() => setPaymentMethod('WALLET')}
                    disabled={walletBalance < pricing.total}
                >
                    <div className="payment-title">Pay with wallet</div>
                    <div className="payment-sub">
                        {walletBalance < pricing.total
                            ? 'Insufficient wallet balance for this booking.'
                            : 'Instant confirmation after payment.'}
                    </div>
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
                            {submitting
                                ? 'Processing...'
                                : isBooked
                                    ? 'Booked'
                                    : paymentMethod === 'VNPAY'
                                        ? 'Pay with VNPay'
                                        : paymentMethod === 'WALLET'
                                            ? 'Pay with wallet'
                                            : 'Book (Pay at salon)'}
                        </button>
                    )}
                </div>
            </section>
        </div>
    );
};

export default BookAppointment;
