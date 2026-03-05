import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    getCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon
} from '../controllers/couponController.js';

const router = express.Router();

// All routes require authentication and SALON_OWNER role
router.use(protect);
router.use(authorize('SALON_OWNER'));

router.route('/')
    .get(getCoupons)
    .post(createCoupon);

router.route('/:id')
    .get(getCouponById)
    .put(updateCoupon)
    .delete(deleteCoupon);

export default router;

