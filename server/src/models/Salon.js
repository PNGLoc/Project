import mongoose from 'mongoose';

const salonSchema = new mongoose.Schema({
    // 1. Liên kết với chủ sở hữu (Bảng Users)
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },

    // 2. Thông tin cơ bản
    name: { type: String, required: true },
    phone: { type: String, required: true }, // SĐT Hotline của tiệm

    // 3. Địa chỉ chi tiết (Dạng Object như tài liệu yêu cầu)
    address: {
        street: String,
        district: String,
        city: { type: String, default: 'TP. Hồ Chí Minh' }
    },

    // 4. Vị trí bản đồ (GeoJSON để tìm kiếm theo bán kính)
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], default: [0, 0] } // [Kinh độ, Vĩ độ]
    },

    // 5. Hình ảnh (Dùng mảng images thay vì 1 string đơn lẻ)
    images: [String],

    // 6. Trạng thái vận hành (QUAN TRỌNG)
    isApproved: { type: Boolean, default: false }, // Admin duyệt mới lên sàn
    isActive: { type: Boolean, default: false },   // Chủ tiệm tự đóng/mở cửa
    rejectionReason: String,                       // Lý do từ chối nếu có

    // 7. Giờ mở cửa (Cấu hình ca làm việc)
    workingHours: [{
        day: Number,  // 0: CN, 1: T2...
        open: String, // "08:00"
        close: String // "20:00"
    }],

    // 8. Dữ liệu hiển thị (Thừa hưởng từ bản cũ)
    rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 }

}, {
    timestamps: true, // Tự động tạo createdAt, updatedAt
    collection: 'salon'
});

salonSchema.index({ ownerId: 1 }, { unique: false });

// Index địa lý để hỗ trợ tìm Salon gần đây
salonSchema.index({ location: "2dsphere" });

export default mongoose.model('Salon', salonSchema);