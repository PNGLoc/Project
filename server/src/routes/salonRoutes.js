import express from 'express';
import multer from 'multer';
import path from 'path'; // Path module for path.join
import fs from 'fs';
import { protect } from '../middlewares/authMiddleware.js';
import {
    registerSalon, approveSalon, rejectSalon, getAllSalons, getPendingSalons,
    getSalonDetails, getDashboardStats, updateSalonLocation, getMySalon
} from '../controllers/salonController.js';
import { getSalonCoupons } from '../controllers/salonCouponController.js';

import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Path resolution: project root -> client/public/assets/salon/temp
        const uploadPath = path.resolve(__dirname, '../../../client/public/assets/salon/temp');

        // Create folder if not exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }

        console.log("-> Multer saving to:", uploadPath);
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
// public coupons for salon (filter/sort supported)
router.get('/:id/coupons', getSalonCoupons);
// private dashboard stats for salon owner
router.get('/dashboard/stats', protect, getDashboardStats);
router.post('/register', protect, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'businessLicenseImage', maxCount: 1 }
]), registerSalon);
router.get('/my-salon', protect, getMySalon); // Added GET route for salon owner
router.patch('/my-salon', protect, updateSalonLocation);
router.get('/pending', protect, getPendingSalons);
router.patch('/approve/:id', protect, approveSalon);
router.delete('/reject/:id', protect, rejectSalon);

export default router;