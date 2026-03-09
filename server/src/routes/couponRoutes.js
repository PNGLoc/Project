import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    getCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    getAllPublicCoupons
} from '../controllers/couponController.js';

const router = express.Router();


// Public route
router.get('/public', getAllPublicCoupons);

// All routes below require authentication and SALON_OWNER role
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

