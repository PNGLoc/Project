import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    guestInfo: {
        fullName: {
            type: String,
            trim: true,
            default: ''
        }
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Staff',
        required: true
    },
    startAt: {
        type: Date,
        required: true
    },
    endAt: {
        type: Date,
        required: true
    },
    totalPrice: {
        type: Number,
        required: true
    },
    originalPrice: {
        type: Number,
        default: 0
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
        default: 'PENDING'
    },
    paymentStatus: {
        type: String,
        enum: ['UNPAID', 'PAID', 'REFUNDED'],
        default: 'UNPAID'
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'VNPAY', 'WALLET'],
        default: 'CASH'
    },
    appliedCoupon: {
        collectedCouponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserCollectedCoupon'
        },
        couponId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coupon'
        },
        code: String,
        discountType: {
            type: String,
            enum: ['PERCENTAGE', 'FIXED_AMOUNT']
        },
        discountValue: Number,
        discountAmount: {
            type: Number,
            default: 0
        }
    },
    note: {
        type: String,
        trim: true,
        default: ''
    },
    vnpay: {
        txnRef: String,
        txnNo: String,
        bankCode: String,
        payDate: String
    },
    serviceSnapshot: {
        name: String,
        price: Number,
        duration: Number
    },
    staffSnapshot: {
        fullName: String
    },
    salonSnapshot: {
        name: String,
        address: String,
        image: String
    }
}, {
    timestamps: true
});

export default mongoose.model('Appointment', appointmentSchema);
