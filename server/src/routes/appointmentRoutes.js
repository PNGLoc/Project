import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
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
router.post('/', protect, authorize('CUSTOMER'), createAppointment);
router.post('/provider', protect, authorize('SALON_OWNER', 'STAFF'), createProviderAppointment);
router.get('/my', protect, authorize('CUSTOMER'), getCustomerAppointments);
router.get('/availability', protect, authorize('CUSTOMER', 'SALON_OWNER', 'STAFF'), getAppointmentAvailability);
router.get('/provider-customers', protect, authorize('SALON_OWNER', 'STAFF'), getProviderCustomers);
router.get('/provider-customers/:customerId/coupons', protect, authorize('SALON_OWNER', 'STAFF'), getProviderCustomerCollectedCoupons);
router.patch('/:id/cancel-vnpay', protect, authorize('CUSTOMER'), cancelPendingVnpayAppointment);
router.patch('/:id/cancel', protect, authorize('CUSTOMER'), cancelCustomerAppointment);
router.get('/salon', protect, authorize('SALON_OWNER', 'STAFF'), getSalonAppointments);
router.patch('/:id/pay-cash', protect, authorize('SALON_OWNER', 'STAFF'), markAppointmentPaidByCash);

router.route('/:id/review')
    .get(protect, authorize('CUSTOMER'), getAppointmentReview)
    .post(protect, authorize('CUSTOMER'), createAppointmentReview)
    .put(protect, authorize('CUSTOMER'), updateAppointmentReview)
    .delete(protect, authorize('CUSTOMER'), deleteAppointmentReview);

router.route('/:id')
    .get(protect, authorize('SALON_OWNER', 'STAFF'), getAppointmentById)
    .put(protect, authorize('SALON_OWNER', 'STAFF'), updateAppointment)
    .delete(protect, authorize('SALON_OWNER', 'STAFF'), deleteAppointment);

export default router;
