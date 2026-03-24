import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { protect } from '../middlewares/authMiddleware.js';
import * as reviewController from '../controllers/reviewController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Safe location in the React Public folder for immediate serving
        const uploadPath = path.resolve(__dirname, '../../../client/public/assets/reviews');
        
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Protect all modifications, public for viewing
router.get('/salon/:salonId', reviewController.getSalonReviews);

// Max 5 images per review
router.post('/', protect, upload.array('images', 5), reviewController.createReview);
router.put('/:id', protect, upload.array('images', 5), reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);

export default router;
