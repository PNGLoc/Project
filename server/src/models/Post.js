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
}, { timestamps: true });

// Index cho search & sorting
postSchema.index({ authorType: 1, createdAt: -1 });
postSchema.index({ authorId: 1, createdAt: -1 });
postSchema.index({ taggedSalonIds: 1, createdAt: -1 });
postSchema.index({ taggedStaffIds: 1, createdAt: -1 });

export default mongoose.model('Post', postSchema);
