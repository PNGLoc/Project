import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true,
        index: true
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    lastMessageSenderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerUnreadCount: {
        type: Number,
        default: 0
    },
    salonUnreadCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index for unique chat between customer and salon
chatSchema.index({ customerId: 1, salonId: 1 }, { unique: true });

// Index for efficient querying
chatSchema.index({ customerId: 1, lastMessageAt: -1 });
chatSchema.index({ salonId: 1, lastMessageAt: -1 });

export default mongoose.model('Chat', chatSchema);

