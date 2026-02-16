import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['DEPOSIT', 'PAYMENT'],
        required: true
    },
    relatedId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    onModel: {
        type: String,
        enum: ['Appointment', 'Bank'],
        required: true
    }
}, {
    timestamps: true
});

export default mongoose.model('Transaction', transactionSchema);
