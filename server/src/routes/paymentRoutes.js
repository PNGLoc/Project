import express from 'express';
import {
	addFundEncrypted,
	getWalletBalance,
	getWalletPublicKey,
	handleVnpayReturn
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { auditAction } from '../middlewares/auditMiddleware.js';

const router = express.Router();

router.get(
	'/vnpay/return',
	auditAction('PAYMENT_VNPAY_CALLBACK', (req) => ({
		txnRef: req.query?.vnp_TxnRef || null,
		responseCode: req.query?.vnp_ResponseCode || null
	})),
	handleVnpayReturn
);

router.get('/wallet/balance', protect, auditAction('WALLET_VIEW_BALANCE'), getWalletBalance);
router.get('/wallet/public-key', protect, auditAction('WALLET_FETCH_PUBLIC_KEY'), getWalletPublicKey);
router.post('/wallet/add-fund', protect, auditAction('WALLET_ADD_FUND_ENCRYPTED'), addFundEncrypted);

export default router;
