import mongoose from 'mongoose';

const commissionRateSchema = new mongoose.Schema(
    {
        commissionPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        previousPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true
    }
);

commissionRateSchema.index({ createdAt: -1 });
commissionRateSchema.index({ commissionPercent: 1 });
commissionRateSchema.index({ updatedBy: 1, createdAt: -1 });

export default mongoose.model('CommissionRate', commissionRateSchema);
