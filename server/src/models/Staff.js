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
        unique: true, // 1 user chỉ làm staff cho 1 salon
    },
    fullName: {
        type: String,
        required: true,
    },
    skills: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
    }],
    schedule: [{
        day: { 
            type: Number, 
            min: 1, 
            max: 7 // 1: Thứ 2, 7: Chủ nhật
        },
        shifts: [String] // VD: ["08:00-12:00", "14:00-18:00"]
    }],
    isActive: {
        type: Boolean,
        default: true,
    },
    // Các field thêm nếu muốn giữ lại (không bắt buộc theo spec)
    // experienceYears: { type: Number, default: 0 },
    // description: String,
    // rating: { type: Number, default: 5.0 },
}, { 
    timestamps: true 
});

export default mongoose.model('Staff', StaffSchema);