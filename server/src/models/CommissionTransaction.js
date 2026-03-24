import mongoose from 'mongoose';

const commissionTransactionSchema = new mongoose.Schema(
    {
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true,
            unique: true
        },
        salonId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Salon',
            required: true
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        grossAmount: {
            type: Number,
            required: true,
            min: 0
        },
        commissionPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        systemAmount: {
            type: Number,
            required: true,
            min: 0
        },
        salonAmount: {
            type: Number,
            required: true,
            min: 0
        },
        paymentMethod: {
            type: String,
            enum: ['CASH', 'VNPAY', 'WALLET'],
            required: true
        },
        paidAt: {
            type: Date,
            required: true,
            default: Date.now
        }
    },
    {
        timestamps: true
    }
);

commissionTransactionSchema.index({ salonId: 1, paidAt: -1 });
commissionTransactionSchema.index({ paymentMethod: 1, paidAt: -1 });
commissionTransactionSchema.index({ paidAt: -1 });

export default mongoose.model('CommissionTransaction', commissionTransactionSchema);
