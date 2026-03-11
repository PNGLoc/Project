import UserCollectedCoupon from '../models/UserCollectedCoupon.js';
import Coupon from '../models/Coupon.js';

// @desc    Collect (save) a coupon to user account
// @route   POST /api/user-coupons/collect/:couponId
// @access  Private/CUSTOMER
export const collectCoupon = async (req, res) => {
    try {
        const userId = req.user._id;
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }

        const now = new Date();
        if (!coupon.isActive) {
            return res.status(400).json({ success: false, message: 'Coupon is inactive' });
        }
        if (new Date(coupon.startDate) > now) {
            return res.status(400).json({ success: false, message: 'Coupon has not started yet' });
        }
        if (new Date(coupon.endDate) < now) {
            return res.status(400).json({ success: false, message: 'Coupon has expired' });
        }
        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }

        const existing = await UserCollectedCoupon.findOne({ userId, couponId });
        if (existing) {
            return res.status(400).json({ success: false, message: 'You have already collected this coupon' });
        }

        const collected = new UserCollectedCoupon({ userId, couponId });
        await collected.save();

        const populated = await UserCollectedCoupon.findById(collected._id)
            .populate('couponId');

        res.status(201).json({
            success: true,
            message: 'Coupon collected successfully',
            collected: populated
        });
    } catch (error) {
        console.error('[COLLECT COUPON ERROR]', error);
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'You have already collected this coupon' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all coupons collected by the current user
// @route   GET /api/user-coupons
// @access  Private/CUSTOMER
export const getMyCollectedCoupons = async (req, res) => {
    try {
        const userId = req.user._id;
        const { status = 'all' } = req.query;

        const filter = { userId };
        if (status === 'used') {
            filter.isUsed = true;
        }

        const collected = await UserCollectedCoupon.find(filter)
            .populate({
                path: 'couponId',
                populate: { path: 'salonId', select: 'name images address' }
            })
            .sort({ createdAt: -1 });

        const items = collected
            .filter(c => c.couponId)
            .map(c => ({
                _id: c._id,
                collectedAt: c.createdAt,
                isUsed: c.isUsed,
                usedAt: c.usedAt,
                coupon: c.couponId,
                salon: c.couponId?.salonId
            }));

        res.json({
            success: true,
            items
        });
    } catch (error) {
        console.error('[GET MY COLLECTED COUPONS ERROR]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Discard (remove) a collected coupon from user account
// @route   DELETE /api/user-coupons/:id
// @access  Private/CUSTOMER
export const discardCollectedCoupon = async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const collected = await UserCollectedCoupon.findById(id);
        if (!collected) {
            return res.status(404).json({ success: false, message: 'Collected coupon not found' });
        }

        if (collected.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized to discard this coupon' });
        }

        await UserCollectedCoupon.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Coupon discarded successfully'
        });
    } catch (error) {
        console.error('[DISCARD COLLECTED COUPON ERROR]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
