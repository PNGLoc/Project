import express from 'express';
import {
	addFundEncrypted,
	getWalletBalance,
	getWalletTopupHistory,
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
router.get('/wallet/topups', protect, getWalletTopupHistory);
router.get('/wallet/public-key', protect, getWalletPublicKey);
router.post('/wallet/add-fund', protect, addFundEncrypted);

export default router;
