import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { auditAction } from '../middlewares/auditMiddleware.js';
import { createSensitiveRateLimiter } from '../middlewares/rateLimitMiddleware.js';
import {
    createAppointment,
    createProviderAppointment,
    markAppointmentPaidByCash,
    getSalonAppointments,
    getAppointmentAvailability,
    getProviderCustomers,
    getProviderCustomerCollectedCoupons,
    getCustomerAppointments,
    cancelPendingVnpayAppointment,
    cancelCustomerAppointment,
    getAppointmentById,
    updateAppointment,
    deleteAppointment,
    getAppointmentReview,
    createAppointmentReview,
    updateAppointmentReview,
    deleteAppointmentReview
} from '../controllers/appointmentController.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

const scheduleLimiter = createSensitiveRateLimiter({
    keyPrefix: 'appointment-schedule',
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many booking requests. Please slow down.'
});

const cancelLimiter = createSensitiveRateLimiter({
    keyPrefix: 'appointment-cancel',
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many cancellation requests. Please slow down.'
});

router.post('/', protect, authorize('CUSTOMER'), scheduleLimiter, auditAction('APPOINTMENT_CREATE_CUSTOMER'), createAppointment);
router.post('/provider', protect, authorize('SALON_OWNER', 'STAFF'), scheduleLimiter, auditAction('APPOINTMENT_CREATE_PROVIDER'), createProviderAppointment);
router.get('/my', protect, authorize('CUSTOMER'), getCustomerAppointments);
router.get('/availability', protect, authorize('CUSTOMER', 'SALON_OWNER', 'STAFF'), getAppointmentAvailability);
router.get('/provider-customers', protect, authorize('SALON_OWNER', 'STAFF'), getProviderCustomers);
router.get('/provider-customers/:customerId/coupons', protect, authorize('SALON_OWNER', 'STAFF'), getProviderCustomerCollectedCoupons);
router.patch('/:id/cancel-vnpay', protect, authorize('CUSTOMER'), cancelLimiter, auditAction('APPOINTMENT_CANCEL_VNPAY_ROLLBACK'), cancelPendingVnpayAppointment);
router.patch('/:id/cancel', protect, authorize('CUSTOMER'), cancelLimiter, auditAction('APPOINTMENT_CANCEL_CUSTOMER'), cancelCustomerAppointment);
router.get('/salon', protect, authorize('SALON_OWNER', 'STAFF'), getSalonAppointments);
router.patch('/:id/pay-cash', protect, authorize('SALON_OWNER', 'STAFF'), markAppointmentPaidByCash);

router.route('/:id/review')
    .get(protect, authorize('CUSTOMER'), getAppointmentReview)
    .post(protect, authorize('CUSTOMER'), auditAction('APPOINTMENT_REVIEW_CREATE'), createAppointmentReview)
    .put(protect, authorize('CUSTOMER'), auditAction('APPOINTMENT_REVIEW_UPDATE'), updateAppointmentReview)
    .delete(protect, authorize('CUSTOMER'), auditAction('APPOINTMENT_REVIEW_DELETE'), deleteAppointmentReview);

router.route('/:id')
    .get(protect, authorize('SALON_OWNER', 'STAFF'), getAppointmentById)
    .put(protect, authorize('SALON_OWNER', 'STAFF'), updateAppointment)
    .delete(protect, authorize('SALON_OWNER', 'STAFF'), deleteAppointment);

export default router;
