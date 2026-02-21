import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { createAppointment, markAppointmentPaidByCash, getSalonAppointments } from '../controllers/appointmentController.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

router.post('/', protect, authorize('CUSTOMER'), createAppointment);
router.get('/salon', protect, authorize('SALON_OWNER', 'STAFF'), getSalonAppointments);
router.patch('/:id/pay-cash', protect, authorize('SALON_OWNER', 'STAFF'), markAppointmentPaidByCash);

export default router;
