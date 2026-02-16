import express from 'express';
import { handleVnpayReturn } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/vnpay/return', handleVnpayReturn);

export default router;
