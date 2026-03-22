import express from 'express';
import {
	addFundEncrypted,
	getWalletBalance,
	getWalletPublicKey,
	handleVnpayReturn
} from '../controllers/paymentController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { auditAction } from '../middlewares/auditMiddleware.js';
import { createSensitiveRateLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

const callbackLimiter = createSensitiveRateLimiter({
	keyPrefix: 'payment-callback',
	windowMs: 60 * 1000,
	max: 30,
	message: 'Too many payment callback requests.'
});

const walletViewLimiter = createSensitiveRateLimiter({
	keyPrefix: 'wallet-view',
	windowMs: 60 * 1000,
	max: 60,
	message: 'Too many wallet balance requests.'
});

const walletFundLimiter = createSensitiveRateLimiter({
	keyPrefix: 'wallet-fund',
	windowMs: 60 * 1000,
	max: 10,
	message: 'Too many add-fund attempts. Please try again later.'
});

router.get(
	'/vnpay/return',
	callbackLimiter,
	auditAction('PAYMENT_VNPAY_CALLBACK', (req) => ({
		txnRef: req.query?.vnp_TxnRef || null,
		responseCode: req.query?.vnp_ResponseCode || null
	})),
	handleVnpayReturn
);

router.get('/wallet/balance', protect, walletViewLimiter, auditAction('WALLET_VIEW_BALANCE'), getWalletBalance);
router.get('/wallet/public-key', protect, walletFundLimiter, auditAction('WALLET_FETCH_PUBLIC_KEY'), getWalletPublicKey);
router.post('/wallet/add-fund', protect, walletFundLimiter, auditAction('WALLET_ADD_FUND_ENCRYPTED'), addFundEncrypted);

export default router;
