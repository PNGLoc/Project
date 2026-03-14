import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { createSalonReport, getReports, updateReport } from '../controllers/reportController.js';

const router = express.Router();

// User creates salon complaint
router.post('/salon', protect, authorize('CUSTOMER'), createSalonReport);

// Admin views & updates reports
router.get('/', protect, authorize('ADMIN'), getReports);
router.patch('/:id', protect, authorize('ADMIN'), updateReport);

export default router;

