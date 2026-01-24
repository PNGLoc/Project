// server/src/models/Staff.js
import mongoose from 'mongoose';

const StaffSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    fullName: {
        type: String,
        required: true,
    },
    // === THÊM PHẦN KỸ NĂNG TRỰC TIẾP VÀO STAFF ===
 skills: [{
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    schedule: [{
        day: { 
            type: Number, 
            min: 1, 
            max: 7
        },
        shifts: [String]
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
}, { 
    timestamps: true 
});

export default mongoose.model('Staff', StaffSchema);