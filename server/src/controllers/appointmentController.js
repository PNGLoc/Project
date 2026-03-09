import Appointment from '../models/Appointment.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Salon from '../models/Salon.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
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
            },
            salonSnapshot: {
                name: salon.name,
                address: `${salon.address.street}, ${salon.address.district}, ${salon.address.city}`,
                image: salon.images && salon.images.length > 0 ? salon.images[0] : ''
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

        if (appointment.paymentMethod !== 'VNPAY' || appointment.paymentStatus === 'PAID') {
            return res.status(400).json({ message: 'This appointment cannot be cancelled by VNPay rollback.' });
        }

        appointment.status = 'CANCELLED';
        appointment.paymentStatus = 'UNPAID';
        await appointment.save();

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

// @desc    Cancel appointment by customer (Only for PENDING status)
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

        // Chỉ cho phép hủy nếu đơn vẫn đang đợi xác nhận
        if (appointment.status !== 'PENDING') {
            return res.status(400).json({ message: 'Only pending appointments can be cancelled.' });
        }

        appointment.status = 'CANCELLED';
        await appointment.save();

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

        return res.json({
            success: true,
            message: 'Appointment cancelled successfully.',
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
