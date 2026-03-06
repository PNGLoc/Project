import Coupon from '../models/Coupon.js';
import Salon from '../models/Salon.js';

// @desc    Get all coupons for a salon (public - for Salon Detail page)
// @route   GET /api/salons/:id/coupons
// @access  Public
export const getSalonCoupons = async (req, res) => {
    try {
        const salon = await Salon.findById(req.params.id);
        if (!salon || !salon.isApproved) {
            return res.status(404).json({
                success: false,
                message: 'Salon not found or not approved yet'
            });
        }

        const { status, sortBy = 'endDate', sortOrder = 'asc' } = req.query;
        const filter = { salonId: salon._id };

        const now = new Date();
        if (status === 'ACTIVE') {
            filter.isActive = true;
            filter.startDate = { $lte: now };
            filter.endDate = { $gte: now };
            filter.$expr = { $lt: ['$usedCount', '$usageLimit'] };
        } else if (status === 'UPCOMING') {
            filter.isActive = true;
            filter.startDate = { $gt: now };
        } else if (status === 'EXPIRED') {
            filter.endDate = { $lt: now };
        } else if (status === 'USED_UP') {
            filter.$expr = { $gte: ['$usedCount', '$usageLimit'] };
        } else if (status === 'INACTIVE') {
            filter.isActive = false;
        }

        const sortOptions = {};
        const validSortFields = ['discountValue', 'endDate', 'discountType', 'createdAt'];
        const field = validSortFields.includes(sortBy) ? sortBy : 'endDate';
        sortOptions[field] = sortOrder === 'desc' ? -1 : 1;

        const coupons = await Coupon.find(filter)
            .sort(sortOptions)
            .limit(100);

        res.json({
            success: true,
            coupons
        });
    } catch (error) {
        console.error('[GET SALON COUPONS ERROR]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
