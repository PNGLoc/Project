import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    }
}, {
    timestamps: true,
    collection: 'categories'
});

// Ensure unique category names per salon
categorySchema.index({ salonId: 1, name: 1 }, { unique: true });

export default mongoose.model('Category', categorySchema);
