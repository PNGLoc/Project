import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { createAppointment, markAppointmentPaidByCash, getSalonAppointments, getAppointmentAvailability } from '../controllers/appointmentController.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

router.post('/', protect, authorize('CUSTOMER'), createAppointment);
router.get('/availability', protect, authorize('CUSTOMER'), getAppointmentAvailability);
router.get('/salon', protect, authorize('SALON_OWNER', 'STAFF'), getSalonAppointments);
router.patch('/:id/pay-cash', protect, authorize('SALON_OWNER', 'STAFF'), markAppointmentPaidByCash);

export default router;
