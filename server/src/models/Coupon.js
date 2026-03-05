import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true,
        index: true
    },
    code: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        index: true
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true,
        min: 0
    },
    minPurchaseAmount: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    maxDiscountAmount: {
        type: Number,
        min: 0,
        default: null // Chỉ áp dụng khi discountType là PERCENTAGE
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    usageLimit: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    description: {
        type: String,
        trim: true,
        maxLength: 500
    }
}, {
    timestamps: true
});

// Compound index để đảm bảo code unique trong mỗi salon
couponSchema.index({ salonId: 1, code: 1 }, { unique: true });

// Index để tìm kiếm coupon theo code và salonId
couponSchema.index({ code: 1, salonId: 1 });

export default mongoose.model('Coupon', couponSchema);

