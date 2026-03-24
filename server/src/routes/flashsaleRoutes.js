import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import * as flashsaleController from '../controllers/flashsaleController.js';

const router = express.Router();

// Public: Get active flashsales for a specific salon
router.get('/salon/:salonId', flashsaleController.getActiveFlashsalesBySalon);

// Public: Get top 3 flashsale services
router.get('/public/top', flashsaleController.getTopPublicFlashsales);

// Protected (Salon Owner Dashboard)
router.get('/owner', protect, flashsaleController.getMyFlashsales);
router.post('/', protect, flashsaleController.createFlashsale);
router.put('/:id', protect, flashsaleController.updateFlashsale);
router.delete('/:id', protect, flashsaleController.deleteFlashsale);

export default router;
