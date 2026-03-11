import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Salon from '../models/Salon.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import UserCollectedCoupon from '../models/UserCollectedCoupon.js';
import { buildVnpayUrl } from '../utils/vnpay.js';
import {
    calculateCouponDiscount,
    reserveCollectedCouponUsage,
    releaseCollectedCouponUsage,
    refundAppointmentToWallet,
    sendBookingConfirmationEmail
} from '../utils/appointmentHelpers.js';

const parsedCancellationHours = Number(process.env.BOOKING_CANCEL_DEADLINE_HOURS || 2);
const CANCELLATION_WINDOW_HOURS = Number.isFinite(parsedCancellationHours) && parsedCancellationHours >= 0
    ? parsedCancellationHours
    : 2;

const createHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const normalizePaymentMethod = (paymentMethod, { allowVnpay = true } = {}) => {
    if (paymentMethod === 'WALLET') return 'WALLET';
    if (allowVnpay && paymentMethod === 'VNPAY') return 'VNPAY';
    return 'CASH';
};

const getSalonAddress = (salon) => {
    const street = salon?.address?.street || '';
    const district = salon?.address?.district || '';
    const city = salon?.address?.city || '';
    return [street, district, city].filter(Boolean).join(', ');
};

const getProviderSalonId = async (user) => {
    if (user.role === 'SALON_OWNER') {
        const salon = await Salon.findOne({ ownerId: user._id });
        return salon?._id || null;
    }

    if (user.role === 'STAFF') {
        const staff = await Staff.findOne({ userId: user._id, isActive: true });
        return staff?.salonId || null;
    }

    return null;
};

const resolveCouponForBooking = async ({ customerId, salonId, collectedCouponId, baseAmount }) => {
    if (!collectedCouponId) {
        return {
            discountAmount: 0,
            finalPrice: baseAmount,
            appliedCoupon: null
        };
    }

    const collectedCoupon = await UserCollectedCoupon.findOne({
        _id: collectedCouponId,
        userId: customerId
    }).populate('couponId');

    if (!collectedCoupon || !collectedCoupon.couponId) {
        throw createHttpError(400, 'Selected coupon is invalid or no longer available.');
    }

    if (collectedCoupon.isUsed) {
        throw createHttpError(400, 'Selected coupon has already been used.');
    }

    const coupon = collectedCoupon.couponId;
    const now = new Date();

    if (!coupon.isActive) {
        throw createHttpError(400, 'Selected coupon is inactive.');
    }

    if (new Date(coupon.startDate) > now || new Date(coupon.endDate) < now) {
        throw createHttpError(400, 'Selected coupon is expired or not started yet.');
    }

    if (coupon.salonId.toString() !== salonId.toString()) {
        throw createHttpError(400, 'Selected coupon does not belong to this salon.');
    }

    if (coupon.usedCount >= coupon.usageLimit) {
        throw createHttpError(400, 'Selected coupon usage limit has been reached.');
    }

    if (baseAmount < coupon.minPurchaseAmount) {
        throw createHttpError(
            400,
            `Coupon requires a minimum purchase of ${coupon.minPurchaseAmount.toLocaleString('vi-VN')} VND.`
        );
    }

    const discountAmount = Math.min(baseAmount, calculateCouponDiscount(coupon, baseAmount));
    const finalPrice = Math.max(0, baseAmount - discountAmount);

    return {
        discountAmount,
        finalPrice,
        appliedCoupon: {
            collectedCouponId: collectedCoupon._id,
            couponId: coupon._id,
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: coupon.discountValue,
            discountAmount
        }
    };
};

const canCancelWithinWindow = (startAt) => {
    const windowMs = CANCELLATION_WINDOW_HOURS * 60 * 60 * 1000;
    return new Date(startAt).getTime() - Date.now() >= windowMs;
};

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private/CUSTOMER
export const createAppointment = async (req, res) => {
    try {
        const {
            salonId,
            serviceId,
            staffId,
            startAt,
            note = '',
            paymentMethod = 'CASH',
            collectedCouponId = null
        } = req.body;

        if (!salonId || !serviceId || !staffId || !startAt) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const startDate = new Date(startAt);
        if (Number.isNaN(startDate.getTime())) {
            return res.status(400).json({ message: 'Invalid start time.' });
        }

        if (startDate.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Start time must be in the future.' });
        }

        const salon = await Salon.findOne({ _id: salonId, isApproved: true });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found or not approved.' });
        }

        const service = await Service.findOne({ _id: serviceId, salonId, isActive: true });
        if (!service) {
            return res.status(404).json({ message: 'Service not found or inactive.' });
        }

        const staff = await Staff.findOne({ _id: staffId, salonId, isActive: true });
        if (!staff) {
            return res.status(404).json({ message: 'Stylist not found or inactive.' });
        }

        const endAt = new Date(startDate.getTime() + service.duration * 60000);
        const conflict = await Appointment.findOne({
            staffId,
            status: { $ne: 'CANCELLED' },
            startAt: { $lt: endAt },
            endAt: { $gt: startDate }
        });

        if (conflict) {
            return res.status(409).json({ message: 'Selected time slot is not available for this stylist.' });
        }

        const couponPricing = await resolveCouponForBooking({
            customerId: req.user._id,
            salonId,
            collectedCouponId,
            baseAmount: service.price
        });

        let normalizedPayment = normalizePaymentMethod(paymentMethod);
        let appointmentStatus = 'PENDING';
        let paymentStatus = 'UNPAID';

        if (couponPricing.finalPrice === 0) {
            appointmentStatus = 'CONFIRMED';
            paymentStatus = 'PAID';
            normalizedPayment = 'CASH';
        } else if (normalizedPayment === 'WALLET') {
            const walletDebited = await User.findOneAndUpdate(
                { _id: req.user._id, walletBalance: { $gte: couponPricing.finalPrice } },
                { $inc: { walletBalance: -couponPricing.finalPrice } },
                { new: true }
            );

            if (!walletDebited) {
                return res.status(400).json({ message: 'Insufficient wallet balance.' });
            }

            appointmentStatus = 'CONFIRMED';
            paymentStatus = 'PAID';
        }

        const appointment = await Appointment.create({
            salonId,
            customerId: req.user._id,
            serviceId,
            staffId,
            startAt: startDate,
            endAt,
            totalPrice: couponPricing.finalPrice,
            originalPrice: service.price,
            discountAmount: couponPricing.discountAmount,
            status: appointmentStatus,
            paymentStatus,
            paymentMethod: normalizedPayment,
            appliedCoupon: couponPricing.appliedCoupon,
            note: typeof note === 'string' ? note.trim() : '',
            serviceSnapshot: {
                name: service.name,
                price: service.price,
                duration: service.duration
            },
            staffSnapshot: {
                fullName: staff.fullName
            },
            salonSnapshot: {
                name: salon.name,
                address: getSalonAddress(salon),
                image: salon.images && salon.images.length > 0 ? salon.images[0] : ''
            }
        });

        if (couponPricing.appliedCoupon?.collectedCouponId) {
            await reserveCollectedCouponUsage({
                collectedCouponId: couponPricing.appliedCoupon.collectedCouponId,
                appointmentId: appointment._id
            });
        }

        if (paymentStatus === 'PAID') {
            await Transaction.create({
                userId: appointment.customerId,
                amount: appointment.totalPrice,
                type: 'PAYMENT',
                relatedId: appointment._id,
                onModel: 'Appointment'
            });
        }

        if (normalizedPayment === 'VNPAY') {
            if (appointment.totalPrice <= 0) {
                return res.status(201).json({
                    success: true,
                    data: appointment
                });
            }

            const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payments/vnpay/return';
            const ipAddr = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const paymentUrl = buildVnpayUrl({
                amount: appointment.totalPrice,
                txnRef: appointment._id.toString(),
                orderInfo: `Appointment ${appointment._id}`,
                ipAddr,
                returnUrl
            });

            return res.status(201).json({
                success: true,
                data: appointment,
                paymentUrl
            });
        }

        sendBookingConfirmationEmail({
            customer: req.user,
            appointment
        });

        return res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        res.status(statusCode).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get customer options for provider booking flow
// @route   GET /api/appointments/provider-customers
// @access  Private/SALON_OWNER, STAFF
export const getProviderCustomers = async (req, res) => {
    try {
        const { q = '' } = req.query;
        const filter = { role: 'CUSTOMER', isActive: true };

        const trimmed = String(q || '').trim();
        if (trimmed) {
            const regex = new RegExp(trimmed, 'i');
            filter.$or = [
                { fullName: regex },
                { email: regex },
                { phone: regex }
            ];
        }

        const customers = await User.find(filter)
            .select('_id fullName email phone walletBalance')
            .sort({ createdAt: -1 })
            .limit(30);

        return res.json({ success: true, data: customers });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Create appointment by provider (owner/staff)
// @route   POST /api/appointments/provider
// @access  Private/SALON_OWNER, STAFF
export const createProviderAppointment = async (req, res) => {
    try {
        const {
            customerId,
            serviceId,
            staffId,
            startAt,
            note = '',
            paymentMethod = 'CASH',
            collectedCouponId = null
        } = req.body;

        if (!customerId || !serviceId || !staffId || !startAt) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const providerSalonId = await getProviderSalonId(req.user);
        if (!providerSalonId) {
            return res.status(404).json({ message: 'Salon context not found for current provider.' });
        }

        const startDate = new Date(startAt);
        if (Number.isNaN(startDate.getTime())) {
            return res.status(400).json({ message: 'Invalid start time.' });
        }

        if (startDate.getTime() < Date.now()) {
            return res.status(400).json({ message: 'Start time must be in the future.' });
        }

        const [salon, customer, service, staff] = await Promise.all([
            Salon.findById(providerSalonId),
            User.findOne({ _id: customerId, role: 'CUSTOMER', isActive: true }),
            Service.findOne({ _id: serviceId, salonId: providerSalonId, isActive: true }),
            Staff.findOne({ _id: staffId, salonId: providerSalonId, isActive: true })
        ]);

        if (!salon) {
            return res.status(404).json({ message: 'Salon not found.' });
        }

        if (!customer) {
            return res.status(404).json({ message: 'Customer not found or inactive.' });
        }

        if (!service) {
            return res.status(404).json({ message: 'Service not found or inactive.' });
        }

        if (!staff) {
            return res.status(404).json({ message: 'Stylist not found or inactive.' });
        }

        const endAt = new Date(startDate.getTime() + service.duration * 60000);
        const conflict = await Appointment.findOne({
            staffId,
            status: { $ne: 'CANCELLED' },
            startAt: { $lt: endAt },
            endAt: { $gt: startDate }
        });

        if (conflict) {
            return res.status(409).json({ message: 'Selected time slot is not available for this stylist.' });
        }

        if (paymentMethod === 'VNPAY') {
            return res.status(400).json({ message: 'Provider booking supports only CASH or WALLET payment.' });
        }

        const couponPricing = await resolveCouponForBooking({
            customerId: customer._id,
            salonId: providerSalonId,
            collectedCouponId,
            baseAmount: service.price
        });

        const normalizedPayment = normalizePaymentMethod(paymentMethod, { allowVnpay: false });

        if (normalizedPayment === 'WALLET') {
            const walletDebited = await User.findOneAndUpdate(
                { _id: customer._id, walletBalance: { $gte: couponPricing.finalPrice } },
                { $inc: { walletBalance: -couponPricing.finalPrice } },
                { new: true }
            );

            if (!walletDebited) {
                return res.status(400).json({ message: 'Customer wallet balance is insufficient.' });
            }
        }

        const appointment = await Appointment.create({
            salonId: providerSalonId,
            customerId: customer._id,
            serviceId,
            staffId,
            startAt: startDate,
            endAt,
            totalPrice: couponPricing.finalPrice,
            originalPrice: service.price,
            discountAmount: couponPricing.discountAmount,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            paymentMethod: normalizedPayment,
            appliedCoupon: couponPricing.appliedCoupon,
            note: typeof note === 'string' ? note.trim() : '',
            serviceSnapshot: {
                name: service.name,
                price: service.price,
                duration: service.duration
            },
            staffSnapshot: {
                fullName: staff.fullName
            },
            salonSnapshot: {
                name: salon.name,
                address: getSalonAddress(salon),
                image: salon.images && salon.images.length > 0 ? salon.images[0] : ''
            }
        });

        if (couponPricing.appliedCoupon?.collectedCouponId) {
            await reserveCollectedCouponUsage({
                collectedCouponId: couponPricing.appliedCoupon.collectedCouponId,
                appointmentId: appointment._id
            });
        }

        await Transaction.create({
            userId: appointment.customerId,
            amount: appointment.totalPrice,
            type: 'PAYMENT',
            relatedId: appointment._id,
            onModel: 'Appointment'
        });

        sendBookingConfirmationEmail({ customer, appointment });

        return res.status(201).json({ success: true, data: appointment });
    } catch (error) {
        const statusCode = error.statusCode || 500;
        return res.status(statusCode).json({ message: error.message || 'Server error' });
    }
};

// @desc    Mark appointment paid by cash
// @route   PATCH /api/appointments/:id/pay-cash
// @access  Private/SALON_OWNER, STAFF
export const markAppointmentPaidByCash = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        let hasAccess = false;
        if (req.user.role === 'SALON_OWNER') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            hasAccess = salon && salon._id.toString() === appointment.salonId.toString();
        }

        if (req.user.role === 'STAFF') {
            const staff = await Staff.findOne({ userId: req.user._id, isActive: true });
            hasAccess = staff && staff.salonId.toString() === appointment.salonId.toString();
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Not authorized to update this appointment.' });
        }

        if (appointment.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'Appointment is already paid.' });
        }

        if (appointment.paymentStatus === 'REFUNDED') {
            return res.status(400).json({ message: 'Appointment was refunded and cannot be paid again.' });
        }

        appointment.paymentStatus = 'PAID';
        appointment.paymentMethod = 'CASH';
        appointment.status = 'CONFIRMED';
        await appointment.save();

        const existing = await Transaction.findOne({
            relatedId: appointment._id,
            onModel: 'Appointment',
            type: 'PAYMENT'
        });

        if (!existing) {
            await Transaction.create({
                userId: appointment.customerId,
                amount: appointment.totalPrice,
                type: 'PAYMENT',
                relatedId: appointment._id,
                onModel: 'Appointment'
            });
        }

        const customer = await User.findById(appointment.customerId).select('fullName email');
        if (customer) {
            sendBookingConfirmationEmail({ customer, appointment });
        }

        return res.json({ success: true, data: appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get booked slots for a staff on a date
// @route   GET /api/appointments/availability?staffId=...&date=YYYY-MM-DD
// @access  Private/CUSTOMER
export const getAppointmentAvailability = async (req, res) => {
    try {
        const { staffId, date } = req.query;
        if (!staffId || !date) {
            return res.status(400).json({ message: 'Missing staffId or date.' });
        }

        const dayStart = new Date(`${date}T00:00:00`);
        const dayEnd = new Date(`${date}T23:59:59.999`);

        if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
            return res.status(400).json({ message: 'Invalid date.' });
        }

        const appointments = await Appointment.find({
            staffId,
            status: { $ne: 'CANCELLED' },
            startAt: { $lte: dayEnd },
            endAt: { $gte: dayStart }
        }).select('startAt endAt');

        return res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get all appointments for a salon (for owner/staff)
// @route   GET /api/appointments/salon
// @access  Private/SALON_OWNER, STAFF
export const getSalonAppointments = async (req, res) => {
    try {
        let salonId;

        if (req.user.role === 'SALON_OWNER') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            if (!salon) return res.status(404).json({ message: 'Salon not found.' });
            salonId = salon._id;
        } else if (req.user.role === 'STAFF') {
            const staff = await Staff.findOne({ userId: req.user._id });
            if (!staff) return res.status(404).json({ message: 'Staff profile not found.' });
            salonId = staff.salonId;
        } else {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const {
            date,
            startDate,
            endDate,
            staffId,
            status,
            customerName,
            serviceName,
            sortBy,
            order = 'desc'
        } = req.query;

        let query = { salonId };

        // Lọc theo trạng thái
        if (status) {
            query.status = status;
        }

        // Lọc theo ngày (cụ thể 1 ngày hoặc khoảng ngày)
        if (date) {
            const startOfDay = new Date(`${date}T00:00:00+07:00`);
            const endOfDay = new Date(`${date}T23:59:59+07:00`);
            query.startAt = { $gte: startOfDay, $lte: endOfDay };
        } else if (startDate || endDate) {
            query.startAt = {};
            if (startDate) query.startAt.$gte = new Date(`${startDate}T00:00:00+07:00`);
            if (endDate) query.startAt.$lte = new Date(`${endDate}T23:59:59+07:00`);
        }

        // Lọc theo nhân viên
        if (staffId) {
            query.staffId = staffId;
        }

        // Lọc theo tên dịch vụ (trong snapshot)
        if (serviceName) {
            query['serviceSnapshot.name'] = { $regex: serviceName, $options: 'i' };
        }

        // Lọc theo tên khách hàng (cần tìm ID khách hàng trước)
        if (customerName) {
            const users = await User.find({
                fullName: { $regex: customerName, $options: 'i' },
                role: 'CUSTOMER'
            }).select('_id');
            const userIds = users.map(u => u._id);
            query.customerId = { $in: userIds };
        }

        // Xử lý sắp xếp
        let sortOptions = {};
        if (sortBy) {
            const sortOrder = order === 'asc' ? 1 : -1;
            if (sortBy === 'customer') {
                // Sắp xếp theo khách hàng trong find() là khó, thường làm ở client hoặc dùng aggregate
                // Ở đây ta mặc định sắp xếp theo startAt nếu không xử lý đặc biệt được
                sortOptions.startAt = sortOrder;
            } else if (sortBy === 'service') {
                sortOptions['serviceSnapshot.name'] = sortOrder;
            } else if (sortBy === 'staff') {
                sortOptions['staffSnapshot.fullName'] = sortOrder;
            } else {
                sortOptions[sortBy] = sortOrder;
            }
        } else {
            sortOptions.startAt = -1; // Mặc định mới nhất lên đầu
        }

        const appointments = await Appointment.find(query)
            .populate('customerId', 'fullName email phone')
            .populate('staffId', 'fullName')
            .sort(sortOptions);

        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get appointments for current customer
// @route   GET /api/appointments/my
// @access  Private/CUSTOMER
export const getCustomerAppointments = async (req, res) => {
    try {
        const { status, startDate, endDate, sortBy, order = 'desc', salonName } = req.query;
        let query = { customerId: req.user._id };

        if (status) {
            query.status = status;
        }

        if (startDate || endDate) {
            query.startAt = {};
            if (startDate) query.startAt.$gte = new Date(startDate);
            if (endDate) query.startAt.$lte = new Date(endDate);
        }

        if (salonName) {
            const salons = await Salon.find({
                name: { $regex: salonName, $options: 'i' }
            }).select('_id');
            const salonIds = salons.map(s => s._id);
            query.salonId = { $in: salonIds };
        }

        let sortOptions = {};
        if (sortBy) {
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;
        } else {
            sortOptions.startAt = -1;
        }

        const appointments = await Appointment.find(query)
            .populate('salonId', 'name address images')
            .sort(sortOptions);

        return res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Cancel pending VNPay appointment by customer
// @route   PATCH /api/appointments/:id/cancel-vnpay
// @access  Private/CUSTOMER
export const cancelPendingVnpayAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        if (appointment.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this appointment.' });
        }

        if (
            appointment.paymentMethod !== 'VNPAY' ||
            appointment.paymentStatus !== 'UNPAID' ||
            appointment.status !== 'PENDING'
        ) {
            return res.status(400).json({ message: 'This appointment cannot be cancelled by VNPay rollback.' });
        }

        appointment.status = 'CANCELLED';
        appointment.paymentStatus = 'UNPAID';
        await appointment.save();

        await releaseCollectedCouponUsage(appointment);

        // Gửi thông báo cho Salon Owner
        const salon = await Salon.findById(appointment.salonId);
        if (salon) {
            await Notification.create({
                recipient: salon.ownerId,
                sender: req.user._id,
                type: 'BOOKING_CANCELLED',
                title: 'Appointment Cancelled',
                message: `Customer ${req.user.fullName} has cancelled their appointment for "${appointment.serviceSnapshot.name}" scheduled at ${new Date(appointment.startAt).toLocaleString()}.`,
                data: { appointmentId: appointment._id }
            });
        }

        return res.json({ success: true, data: appointment });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Cancel appointment by customer with cancellation window policy
// @route   PATCH /api/appointments/:id/cancel
// @access  Private/CUSTOMER
export const cancelCustomerAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Kiểm tra quyền sở hữu
        if (appointment.customerId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this appointment.' });
        }

        if (['COMPLETED', 'CANCELLED'].includes(appointment.status)) {
            return res.status(400).json({ message: 'This appointment can no longer be cancelled.' });
        }

        if (!canCancelWithinWindow(appointment.startAt)) {
            return res.status(400).json({
                message: `You can only cancel at least ${CANCELLATION_WINDOW_HOURS} hour(s) before the appointment starts.`
            });
        }

        let refundedAmount = 0;
        if (
            appointment.paymentStatus === 'PAID' &&
            (appointment.paymentMethod === 'VNPAY' || appointment.paymentMethod === 'WALLET')
        ) {
            refundedAmount = await refundAppointmentToWallet(appointment);
            appointment.paymentStatus = 'REFUNDED';
        }

        appointment.status = 'CANCELLED';
        await appointment.save();

        await releaseCollectedCouponUsage(appointment);

        // Gửi thông báo cho Salon Owner
        const salon = await Salon.findById(appointment.salonId);
        if (salon) {
            await Notification.create({
                recipient: salon.ownerId,
                sender: req.user._id,
                type: 'BOOKING_CANCELLED',
                title: 'Booking Cancelled by Customer',
                message: `Customer ${req.user.fullName} cancelled appointment for "${appointment.serviceSnapshot.name}" at ${new Date(appointment.startAt).toLocaleString()}`,
                data: { appointmentId: appointment._id }
            });
        }

        const message = refundedAmount > 0
            ? 'Appointment cancelled successfully. Payment was refunded to your wallet.'
            : 'Appointment cancelled successfully.';

        return res.json({
            success: true,
            message,
            refundedAmount,
            data: appointment
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Get single appointment details
// @route   GET /api/appointments/:id
// @access  Private/SALON_OWNER, STAFF
export const getAppointmentById = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('customerId', 'fullName email phone avatar')
            .populate('serviceId', 'name price duration')
            .populate('staffId', 'fullName avatar');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Check permissions
        let hasAccess = false;
        if (req.user.role === 'SALON_OWNER') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            hasAccess = salon && salon._id.toString() === appointment.salonId.toString();
        } else if (req.user.role === 'STAFF') {
            const staff = await Staff.findOne({ userId: req.user._id, isActive: true });
            hasAccess = staff && staff._id.toString() === appointment.staffId.toString();
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Not authorized to view this appointment.' });
        }

        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Update an appointment
// @route   PUT /api/appointments/:id
// @access  Private/SALON_OWNER, STAFF
export const updateAppointment = async (req, res) => {
    try {
        const { startAt, status, note, staffId } = req.body;
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Anti-Fraud Validation: Lock modifications for COMPLETED or CANCELLED appointments
        if (appointment.status === 'COMPLETED') {
            return res.status(400).json({ message: 'Cannot modify a completed appointment.' });
        }
        if (appointment.status === 'CANCELLED') {
            return res.status(400).json({ message: 'Cannot modify a cancelled appointment.' });
        }

        // Check permissions
        let hasAccess = false;
        let isOwner = false;
        if (req.user.role === 'SALON_OWNER') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            hasAccess = salon && salon._id.toString() === appointment.salonId.toString();
            isOwner = true;
        } else if (req.user.role === 'STAFF') {
            const staff = await Staff.findOne({ userId: req.user._id, isActive: true });
            hasAccess = staff && staff._id.toString() === appointment.staffId.toString();
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Not authorized to update this appointment.' });
        }

        // Update fields
        if (status) appointment.status = status;
        if (note !== undefined) appointment.note = note;

        if (startAt) {
            const startDate = new Date(startAt);
            if (Number.isNaN(startDate.getTime())) {
                return res.status(400).json({ message: 'Invalid start time.' });
            }
            appointment.startAt = startDate;
            // Recalculate endAt based on snapshot duration
            if (appointment.serviceSnapshot && appointment.serviceSnapshot.duration) {
                appointment.endAt = new Date(startDate.getTime() + appointment.serviceSnapshot.duration * 60000);
            }
        }

        // Only owner can reassign staff
        if (staffId && isOwner && staffId !== appointment.staffId.toString()) {
            const newStaff = await Staff.findOne({ _id: staffId, salonId: appointment.salonId, isActive: true });
            if (!newStaff) {
                return res.status(400).json({ message: 'New stylist not found or inactive.' });
            }
            appointment.staffId = staffId;
            if (appointment.staffSnapshot) {
                appointment.staffSnapshot.fullName = newStaff.fullName;
            }
        }

        // Conflict check if time or staff changed
        if (startAt || staffId) {
            const conflict = await Appointment.findOne({
                _id: { $ne: appointment._id },
                staffId: appointment.staffId,
                status: { $ne: 'CANCELLED' },
                startAt: { $lt: appointment.endAt },
                endAt: { $gt: appointment.startAt }
            });

            if (conflict) {
                return res.status(409).json({ message: 'Selected time slot is not available for this stylist.' });
            }
        }

        await appointment.save();
        res.json({ success: true, data: appointment });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Delete (cancel) an appointment
// @route   DELETE /api/appointments/:id
// @access  Private/SALON_OWNER, STAFF
export const deleteAppointment = async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found.' });
        }

        // Anti-Fraud Validation: Prevent deletion of COMPLETED appointments
        if (appointment.status === 'COMPLETED') {
            return res.status(400).json({ message: 'Cannot delete a completed appointment.' });
        }

        // Check permissions
        let hasAccess = false;
        if (req.user.role === 'SALON_OWNER') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            hasAccess = salon && salon._id.toString() === appointment.salonId.toString();
        } else if (req.user.role === 'STAFF') {
            const staff = await Staff.findOne({ userId: req.user._id, isActive: true });
            hasAccess = staff && staff._id.toString() === appointment.staffId.toString();
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Not authorized to delete this appointment.' });
        }

        await appointment.deleteOne();

        // Gửi thông báo cho Khách hàng
        await Notification.create({
            recipient: appointment.customerId,
            sender: req.user._id,
            type: 'BOOKING_CANCELLED',
            title: 'Your Appointment was Cancelled',
            message: `Your appointment for "${appointment.serviceSnapshot.name}" at ${new Date(appointment.startAt).toLocaleString()} has been cancelled by the salon.`,
            data: { appointmentId: appointment._id }
        });

        res.json({ success: true, message: 'Appointment deleted successfully.', data: appointment });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
