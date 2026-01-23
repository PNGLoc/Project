import Service from '../models/Service.js';
import mongoose from 'mongoose';

// @desc    Lấy danh sách dịch vụ của chủ salon (Mảng sẽ hết rỗng)
// @route   GET /api/services/owner
export const getMyServices = async (req, res) => {
    try {
        // Mongoose sẽ tự hiểu req.user._id là ObjectId để so sánh với DB
        const services = await Service.find({ salonId: req.user._id });
        res.json(services);
    } catch (error) {
        res.status(500).json({ message: "Lỗi khi lấy danh sách: " + error.message });
    }
};

// @desc    Tạo dịch vụ mới
// @route   POST /api/services/create
export const createService = async (req, res) => {
    try {
        const { name, price, duration, description } = req.body;
        const service = new Service({
            name,
            price: Number(price),
            duration: Number(duration),
            description,
            isActive: true,
            salonId: new mongoose.Types.ObjectId(req.user._id) // QUAN TRỌNG: Phải là ObjectId
        });

        const createdService = await service.save();
        res.status(201).json(createdService);
    } catch (error) {
        console.error("Lỗi tạo dịch vụ:", error);
        res.status(400).json({ message: "Dữ liệu không hợp lệ", error: error.message });
    }
};

// @desc    Cập nhật dịch vụ
// @route   PUT /api/services/:id
export const updateService = async (req, res) => {
    try {
        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, salonId: req.user._id }, // Bảo mật: Chỉ chủ sở hữu mới sửa được
            req.body,
            { new: true, runValidators: true }
        );

        if (!service) return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
        res.json(service);
    } catch (error) {
        res.status(400).json({ message: "Cập nhật thất bại", error: error.message });
    }
};

// @desc    Ẩn dịch vụ (Soft Delete)
// @route   PATCH /api/services/:id/hide
export const hideService = async (req, res) => {
    try {
        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, salonId: req.user._id },
            { isActive: false },
            { new: true }
        );

        if (!service) return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
        res.json({ message: "Đã ẩn dịch vụ thành công", service });
    } catch (error) {
        res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
};