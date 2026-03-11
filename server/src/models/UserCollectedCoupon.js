import mongoose from 'mongoose';

const userCollectedCouponSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        required: true,
        index: true
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    usedAt: {
        type: Date,
        default: null
    },
    usedAppointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        default: null
    }
}, {
    timestamps: true
});

// Compound index: one user can only collect one coupon once
userCollectedCouponSchema.index({ userId: 1, couponId: 1 }, { unique: true });

export default mongoose.model('UserCollectedCoupon', userCollectedCouponSchema);
