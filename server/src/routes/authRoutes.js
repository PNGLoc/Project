import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { register, verifyEmail, login, forgotPassword, resetPassword, getUserProfile, updateUserProfile, changePassword, resendOTP, updateAvatar } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Multer config for user avatar uploads
const AVATAR_DIR = path.resolve(process.cwd(), '../client/public/assets/avatars');
if (!fs.existsSync(AVATAR_DIR)) {
    fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const avatarStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, AVATAR_DIR);
    },
    filename: function (req, file, cb) {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname || '') || '';
        cb(null, `${unique}${ext}`);
    },
});

const uploadAvatar = multer({ storage: avatarStorage });

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-otp', resendOTP);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);


router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);
router.put('/avatar', protect, uploadAvatar.single('avatar'), updateAvatar);

export default router;
