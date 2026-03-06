import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    collectCoupon,
    getMyCollectedCoupons,
    discardCollectedCoupon
} from '../controllers/userCollectedCouponController.js';

const router = express.Router();

router.use(protect);
router.use(authorize('CUSTOMER'));

router.post('/collect/:couponId', collectCoupon);
router.get('/', getMyCollectedCoupons);
router.delete('/:id', discardCollectedCoupon);

export default router;
