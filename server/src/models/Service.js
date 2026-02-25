import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
    salonId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Salon',
        required: true
    },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    duration: { type: Number, required: true }, // Số phút
    image: { type: String }, // Đường dẫn ảnh local
    isActive: { type: Boolean, default: true } // Kích hoạt/Ẩn dịch vụ
}, { timestamps: true });

export default mongoose.model('Service', serviceSchema);