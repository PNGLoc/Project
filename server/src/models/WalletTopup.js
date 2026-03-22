import mongoose from 'mongoose';

const walletTopupSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1000
    },
    status: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED'],
        default: 'PENDING',
        index: true
    },
    method: {
        type: String,
        enum: ['VNPAY'],
        default: 'VNPAY'
    },
    vnpay: {
        txnRef: { type: String, default: '' },
        txnNo: { type: String, default: '' },
        bankCode: { type: String, default: '' },
        payDate: { type: String, default: '' },
        responseCode: { type: String, default: '' }
    }
}, {
    timestamps: true
});

export default mongoose.model('WalletTopup', walletTopupSchema);
