import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        // Polymorphic: có thể là User hoặc Salon ID
    },
    authorType: {
        type: String,
        enum: ['Customer', 'Salon'],
        required: true,
    },
    content: {
        type: String,
        default: '',
    },
    images: {
        type: [String], // Local paths like /assets/posts/...
        default: [],
    },
    taggedSalonIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Salon',
        default: [],
    },
    taggedStaffIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Staff',
        default: [],
    },
    linkedServiceIds: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Service',
        default: [],
    },
    // Legacy single-service field (keep for backward compatibility)
    linkedServiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        default: null,
    },
    likes: {
        type: Number,
        default: 0,
    },
    likedBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            content: {
                type: String,
                required: true,
                trim: true,
                maxLength: 500,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
        }
    ],
}, { timestamps: true });

// Index cho search & sorting
postSchema.index({ authorType: 1, createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ taggedSalonIds: 1, createdAt: -1 });
postSchema.index({ taggedStaffIds: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);
