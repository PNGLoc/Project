import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    createAppointment,
    markAppointmentPaidByCash,
    getSalonAppointments,
    getAppointmentAvailability,
    getCustomerAppointments,
    cancelPendingVnpayAppointment,
    cancelCustomerAppointment,
    getAppointmentById,
    updateAppointment,
    deleteAppointment
} from '../controllers/appointmentController.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

router.post('/', protect, authorize('CUSTOMER'), createAppointment);
router.get('/my', protect, authorize('CUSTOMER'), getCustomerAppointments);
router.get('/availability', protect, authorize('CUSTOMER'), getAppointmentAvailability);
router.patch('/:id/cancel-vnpay', protect, authorize('CUSTOMER'), cancelPendingVnpayAppointment);
router.patch('/:id/cancel', protect, authorize('CUSTOMER'), cancelCustomerAppointment);
router.get('/salon', protect, authorize('SALON_OWNER', 'STAFF'), getSalonAppointments);
router.patch('/:id/pay-cash', protect, authorize('SALON_OWNER', 'STAFF'), markAppointmentPaidByCash);

router.route('/:id')
    .get(protect, authorize('SALON_OWNER', 'STAFF'), getAppointmentById)
    .put(protect, authorize('SALON_OWNER', 'STAFF'), updateAppointment)
    .delete(protect, authorize('SALON_OWNER', 'STAFF'), deleteAppointment);

export default router;
