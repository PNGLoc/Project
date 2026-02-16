import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { createAppointment, markAppointmentPaidByCash } from '../controllers/appointmentController.js';

const router = express.Router();

router.post('/', protect, authorize('CUSTOMER'), createAppointment);
router.patch('/:id/pay-cash', protect, authorize('SALON_OWNER', 'STAFF'), markAppointmentPaidByCash);

export default router;
