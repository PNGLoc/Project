import express from 'express';
import { register, verifyEmail, login, forgotPassword, resetPassword, getUserProfile, updateUserProfile, changePassword } from '../controllers/authController.js';

const router = express.Router();

import { protect } from '../middlewares/authMiddleware.js';

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);


router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

export default router;
