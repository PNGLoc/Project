import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        maxLength: 1000
    },
    images: [{
        type: String
    }],
    isEdited: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// A user can only leave one review per salon
reviewSchema.index({ salonId: 1, userId: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
