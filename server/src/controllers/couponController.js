import Coupon from '../models/Coupon.js';
import Salon from '../models/Salon.js';

// Helper function để lấy salonId từ user
const getUserSalonId = async (userId) => {
    const salon = await Salon.findOne({ ownerId: userId });
    return salon?._id || null;
};

// @desc    Get all coupons for a salon (SALON_OWNER only)
// @route   GET /api/coupons
// @access  Private/SALON_OWNER
export const getCoupons = async (req, res) => {
    try {
        const salonId = await getUserSalonId(req.user._id);
        
        if (!salonId) {
            return res.status(403).json({ 
                message: 'You must own a salon to manage coupons' 
            });
        }

        const { page = 1, limit = 20, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        const filter = { salonId };
        
        // Search by code
        if (search && search.trim()) {
            filter.code = { $regex: search.trim(), $options: 'i' };
        }

        // Filter by status
        const now = new Date();
        if (status === 'ACTIVE') {
            // Đang chạy: đã bắt đầu, chưa hết hạn, còn lượt sử dụng, đang bật
            filter.isActive = true;
            filter.startDate = { $lte: now };
            filter.endDate = { $gte: now };
        } else if (status === 'UPCOMING') {
            // Chưa tới ngày bắt đầu nhưng đã bật
            filter.isActive = true;
            filter.startDate = { $gt: now };
        } else if (status === 'INACTIVE') {
            filter.isActive = false;
        } else if (status === 'EXPIRED') {
            filter.endDate = { $lt: now };
        } else if (status === 'USED_UP') {
            // Filter coupons where usedCount >= usageLimit
            filter.$expr = { $gte: ['$usedCount', '$usageLimit'] };
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * limitNum;

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [total, coupons] = await Promise.all([
            Coupon.countDocuments(filter),
            Coupon.find(filter)
                .sort(sortOptions)
                .skip(skip)
                .limit(limitNum)
        ]);

        res.json({
            coupons,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('[GET COUPONS ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Get coupon by ID
// @route   GET /api/coupons/:id
// @access  Private/SALON_OWNER
export const getCouponById = async (req, res) => {
    try {
        const salonId = await getUserSalonId(req.user._id);
        
        if (!salonId) {
            return res.status(403).json({ 
                message: 'You must own a salon to view coupons' 
            });
        }

        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Check if coupon belongs to user's salon
        if (coupon.salonId.toString() !== salonId.toString()) {
            return res.status(403).json({ 
                message: 'You do not have permission to view this coupon' 
            });
        }

        res.json(coupon);
    } catch (error) {
        console.error('[GET COUPON BY ID ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Create new coupon
// @route   POST /api/coupons
// @access  Private/SALON_OWNER
export const createCoupon = async (req, res) => {
    try {
        const salonId = await getUserSalonId(req.user._id);
        
        if (!salonId) {
            return res.status(403).json({ 
                message: 'You must own a salon to create coupons' 
            });
        }

        const {
            code,
            discountType,
            discountValue,
            minPurchaseAmount,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description,
            isActive
        } = req.body;

        // Validate required fields
        if (!code || !discountType || !discountValue || !startDate || !endDate || !usageLimit) {
            return res.status(400).json({ 
                message: 'Please provide all required fields' 
            });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        if (start >= end) {
            return res.status(400).json({ 
                message: 'End date must be after start date' 
            });
        }

        // Validate discount value
        if (discountType === 'PERCENTAGE' && (discountValue < 0 || discountValue > 100)) {
            return res.status(400).json({ 
                message: 'Percentage discount must be between 0 and 100' 
            });
        }

        if (discountType === 'FIXED_AMOUNT' && discountValue < 0) {
            return res.status(400).json({ 
                message: 'Fixed amount discount must be greater than 0' 
            });
        }

        // Check if code already exists for this salon
        const existingCoupon = await Coupon.findOne({ 
            salonId, 
            code: code.trim().toUpperCase() 
        });

        if (existingCoupon) {
            return res.status(400).json({ 
                message: 'Coupon code already exists for your salon' 
            });
        }

        const coupon = new Coupon({
            salonId,
            code: code.trim().toUpperCase(),
            discountType,
            discountValue,
            minPurchaseAmount: minPurchaseAmount || 0,
            maxDiscountAmount: discountType === 'PERCENTAGE' ? maxDiscountAmount : null,
            startDate: start,
            endDate: end,
            usageLimit,
            description: description || '',
            isActive: isActive !== undefined ? isActive : true
        });

        await coupon.save();

        res.status(201).json({
            message: 'Coupon created successfully',
            coupon
        });
    } catch (error) {
        console.error('[CREATE COUPON ERROR]', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'Coupon code already exists for your salon' 
            });
        }
        
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Update coupon
// @route   PUT /api/coupons/:id
// @access  Private/SALON_OWNER
export const updateCoupon = async (req, res) => {
    try {
        const salonId = await getUserSalonId(req.user._id);
        
        if (!salonId) {
            return res.status(403).json({ 
                message: 'You must own a salon to update coupons' 
            });
        }

        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Check if coupon belongs to user's salon
        if (coupon.salonId.toString() !== salonId.toString()) {
            return res.status(403).json({ 
                message: 'You do not have permission to update this coupon' 
            });
        }

        const {
            code,
            discountType,
            discountValue,
            minPurchaseAmount,
            maxDiscountAmount,
            startDate,
            endDate,
            usageLimit,
            description,
            isActive
        } = req.body;

        // Validate dates if provided
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : coupon.startDate;
            const end = endDate ? new Date(endDate) : coupon.endDate;
            
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ message: 'Invalid date format' });
            }

            if (start >= end) {
                return res.status(400).json({ 
                    message: 'End date must be after start date' 
                });
            }
        }

        // Validate discount value if provided
        const finalDiscountType = discountType || coupon.discountType;
        const finalDiscountValue = discountValue !== undefined ? discountValue : coupon.discountValue;

        if (finalDiscountType === 'PERCENTAGE' && (finalDiscountValue < 0 || finalDiscountValue > 100)) {
            return res.status(400).json({ 
                message: 'Percentage discount must be between 0 and 100' 
            });
        }

        if (finalDiscountType === 'FIXED_AMOUNT' && finalDiscountValue < 0) {
            return res.status(400).json({ 
                message: 'Fixed amount discount must be greater than 0' 
            });
        }

        // Check if code already exists for this salon (if code is being changed)
        if (code && code.trim().toUpperCase() !== coupon.code) {
            const existingCoupon = await Coupon.findOne({ 
                salonId, 
                code: code.trim().toUpperCase(),
                _id: { $ne: coupon._id }
            });

            if (existingCoupon) {
                return res.status(400).json({ 
                    message: 'Coupon code already exists for your salon' 
                });
            }
        }

        // Update fields
        if (code) coupon.code = code.trim().toUpperCase();
        if (discountType) coupon.discountType = discountType;
        if (discountValue !== undefined) coupon.discountValue = discountValue;
        if (minPurchaseAmount !== undefined) coupon.minPurchaseAmount = minPurchaseAmount;
        if (maxDiscountAmount !== undefined) {
            coupon.maxDiscountAmount = finalDiscountType === 'PERCENTAGE' ? maxDiscountAmount : null;
        }
        if (startDate) coupon.startDate = new Date(startDate);
        if (endDate) coupon.endDate = new Date(endDate);
        if (usageLimit !== undefined) coupon.usageLimit = usageLimit;
        if (description !== undefined) coupon.description = description;
        if (isActive !== undefined) coupon.isActive = isActive;

        await coupon.save();

        res.json({
            message: 'Coupon updated successfully',
            coupon
        });
    } catch (error) {
        console.error('[UPDATE COUPON ERROR]', error);
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: 'Coupon code already exists for your salon' 
            });
        }
        
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Delete coupon
// @route   DELETE /api/coupons/:id
// @access  Private/SALON_OWNER
export const deleteCoupon = async (req, res) => {
    try {
        const salonId = await getUserSalonId(req.user._id);
        
        if (!salonId) {
            return res.status(403).json({ 
                message: 'You must own a salon to delete coupons' 
            });
        }

        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({ message: 'Coupon not found' });
        }

        // Check if coupon belongs to user's salon
        if (coupon.salonId.toString() !== salonId.toString()) {
            return res.status(403).json({ 
                message: 'You do not have permission to delete this coupon' 
            });
        }

        await Coupon.findByIdAndDelete(req.params.id);

        res.json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        console.error('[DELETE COUPON ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

