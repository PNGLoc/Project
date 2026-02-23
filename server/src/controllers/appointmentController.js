import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Salon from '../models/Salon.js';
import Transaction from '../models/Transaction.js';
import { buildVnpayUrl } from '../utils/vnpay.js';

// @desc    Create appointment
// @route   POST /api/appointments
// @access  Private/CUSTOMER
export const createAppointment = async (req, res) => {
    try {
        const { salonId, serviceId, staffId, startAt, note = '', paymentMethod = 'CASH' } = req.body;

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
        const normalizedPayment = paymentMethod === 'VNPAY' ? 'VNPAY' : 'CASH';
        const paymentStatus = normalizedPayment === 'CASH' ? 'UNPAID' : 'UNPAID';

        const appointment = await Appointment.create({
            salonId,
            customerId: req.user._id,
            serviceId,
            staffId,
            startAt: startDate,
            endAt,
            totalPrice: service.price,
            status: 'PENDING',
            paymentStatus,
            paymentMethod: normalizedPayment,
            note: note.trim(),
            serviceSnapshot: {
                name: service.name,
                price: service.price,
                duration: service.duration
            },
            staffSnapshot: {
                fullName: staff.fullName
            }
        });

        if (normalizedPayment === 'VNPAY') {
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

        return res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
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

        const { date, staffId } = req.query;
        let query = { salonId };

        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.startAt = { $gte: startOfDay, $lte: endOfDay };
        }

        if (staffId) {
            query.staffId = staffId;
        }

        const appointments = await Appointment.find(query)
            .populate('customerId', 'fullName email phone')
            .sort({ startAt: 1 });

        res.json({
            success: true,
            count: appointments.length,
            data: appointments
        });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
};
