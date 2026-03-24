import express from 'express';
import {
    getDashboardStats,
    getChartData,
    getRecentActivity,
    getCommissionConfig,
    updateCommissionConfig,
    getCommissionHistory,
    getCommissionTransactions
} from '../controllers/adminController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize('ADMIN'), getDashboardStats);
router.get('/charts', protect, authorize('ADMIN'), getChartData);
router.get('/activity', protect, authorize('ADMIN'), getRecentActivity);
router.get('/commission-config', protect, authorize('ADMIN'), getCommissionConfig);
router.put('/commission-config', protect, authorize('ADMIN'), updateCommissionConfig);
router.get('/commission-history', protect, authorize('ADMIN'), getCommissionHistory);
router.get('/commission-transactions', protect, authorize('ADMIN'), getCommissionTransactions);

export default router;
