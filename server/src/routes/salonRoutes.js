import express from 'express';
import multer from 'multer';
import path from 'path'; // Thêm cái này để dùng path.join
import fs from 'fs';
import { protect } from '../middlewares/authMiddleware.js';
import {
    registerSalon, approveSalon, rejectSalon, getAllSalons, getPendingSalons,
    getSalonDetails
} from '../controllers/salonController.js';

import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Đường dẫn từ: Project/server/src/routes
        // Nhảy 3 cấp (../../../) để ra Project/
        const uploadPath = path.resolve(__dirname, '../../../client/public/assets/salon/temp');

        // Tạo folder nếu chưa có
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        console.log("-> Multer chuẩn bị lưu vào:", uploadPath);
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/', getAllSalons);
// public detail endpoint used by SalonDetail page
router.get('/:id/details', getSalonDetails);
router.post('/register', protect, upload.single('image'), registerSalon); // 'image' phải khớp với field bên Frontend gửi lên
router.get('/pending', protect, getPendingSalons);
router.patch('/approve/:id', protect, approveSalon);
router.delete('/reject/:id', protect, rejectSalon);

export default router;