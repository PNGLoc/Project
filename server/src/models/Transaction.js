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
        enum: ['DEPOSIT', 'PAYMENT', 'REFUND'],
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

transactionSchema.index(
    { relatedId: 1, onModel: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            onModel: 'Appointment',
            type: 'PAYMENT'
        }
    }
);

transactionSchema.index(
    { relatedId: 1, onModel: 1, type: 1 },
    {
        unique: true,
        partialFilterExpression: {
            onModel: 'Appointment',
            type: 'REFUND'
        }
    }
);

export default mongoose.model('Transaction', transactionSchema);
