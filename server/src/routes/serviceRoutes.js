import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import * as serviceController from '../controllers/serviceController.js';

const router = express.Router();

// Public: Lấy danh sách dịch vụ theo salon(booking)
router.get('/salon/:salonId', serviceController.getPublicServicesBySalon);

// Lấy danh sách dịch vụ của chủ salon (Dashboard)
router.get('/owner', protect, serviceController.getMyServices);

// Tạo dịch vụ mới
router.post('/create', protect, serviceController.createService);

// Cập nhật dịch vụ theo ID
router.put('/:id', protect, serviceController.updateService);

// Xóa dịch vụ theo ID
router.patch('/:id/hide', protect, serviceController.hideService);

export default router;