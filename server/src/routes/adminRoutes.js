import express from 'express';
import { getDashboardStats, getChartData, getRecentActivity, getAuditLogs } from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize('ADMIN'), getDashboardStats);
router.get('/charts', protect, authorize('ADMIN'), getChartData);
router.get('/activity', protect, authorize('ADMIN'), getRecentActivity);
router.get('/audit-logs', protect, authorize('ADMIN'), getAuditLogs);

export default router;
