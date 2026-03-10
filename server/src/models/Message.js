import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    senderType: {
        type: String,
        enum: ['CUSTOMER', 'SALON'],
        required: true
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxLength: [1000, 'Message cannot exceed 1000 characters']
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);

