import express from 'express';
import multer from 'multer';
import { protect } from '../middlewares/authMiddleware.js';
import {
    registerSalon, approveSalon, rejectSalon, getAllSalons, getPendingSalons
} from '../controllers/salonController.js';

const router = express.Router();

// Cấu hình multer đơn giản ở đây (nhớ tạo folder temp)
const upload = multer({ dest: '../../client/public/assets/salon/temp' });

router.get('/', getAllSalons);
router.post('/register', protect, upload.single('image'), registerSalon);
router.get('/pending', protect, getPendingSalons);
router.patch('/approve/:id', protect, approveSalon);
router.delete('/reject/:id', protect, rejectSalon);

export default router;