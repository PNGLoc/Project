import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  createSalonReport,
  getReports,
  updateReport,
  createProviderUserReport,
  getMyProviderReports,
  getMyProviderReportDetail,
  getMyReportedAppointmentIds
} from '../controllers/reportController.js';

const router = express.Router();

// User creates salon complaint
router.post('/salon', protect, authorize('CUSTOMER'), createSalonReport);

// Admin views & updates reports
router.get('/', protect, authorize('ADMIN'), getReports);
router.patch('/:id', protect, authorize('ADMIN'), updateReport);

// Provider (SALON_OWNER) reports user from booking
router.post('/provider', protect, authorize('SALON_OWNER'), createProviderUserReport);
router.get('/provider/mine', protect, authorize('SALON_OWNER'), getMyProviderReports);
router.get('/provider/reported-appointments', protect, authorize('SALON_OWNER'), getMyReportedAppointmentIds);
router.get('/provider/:id', protect, authorize('SALON_OWNER'), getMyProviderReportDetail);

export default router;

