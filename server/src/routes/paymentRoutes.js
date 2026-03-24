import express from 'express';
import {
	addFundEncrypted,
	getWalletBalance,
	getWalletPublicKey,
	handleVnpayReturn
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get(
	'/vnpay/return',
	handleVnpayReturn
);

router.get('/wallet/balance', protect, getWalletBalance);
router.get('/wallet/public-key', protect, getWalletPublicKey);
router.post('/wallet/add-fund', protect, addFundEncrypted);

export default router;
