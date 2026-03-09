import express from 'express';
import { getDashboardStats, getChartData, getRecentActivity } from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize('ADMIN'), getDashboardStats);
router.get('/charts', protect, authorize('ADMIN'), getChartData);
router.get('/activity', protect, authorize('ADMIN'), getRecentActivity);

export default router;
