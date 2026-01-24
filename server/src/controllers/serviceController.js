import Service from '../models/Service.js';
import Salon from '../models/Salon.js'; // Đảm bảo import model Salon
import { getMySalon } from './salonController.js';

// @desc    Lấy danh sách dịch vụ của chủ salon
// @route   GET /api/services/owner
export const getMyServices = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ message: "Không tìm thấy Salon" });

        // Tìm dịch vụ theo salonId (ID của thực thể Salon)
        const services = await Service.find({ salonId: mySalon._id });
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
        const mySalon = await getMySalon(req.user._id);

        if (!mySalon) {
            return res.status(404).json({ message: "Bạn phải tạo thông tin Salon trước!" });
        }

        const service = new Service({
            name,
            price: Number(price),
            duration: Number(duration),
            description,
            salonId: mySalon._id, // Gán ID của Salon
            isActive: true
        });

        const createdService = await service.save();
        res.status(201).json(createdService);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Cập nhật dịch vụ
// @route   PUT /api/services/:id
export const updateService = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ message: "Không tìm thấy Salon" });

        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, salonId: mySalon._id }, // Kiểm tra đúng ID dịch vụ thuộc Salon này
            req.body,
            { new: true, runValidators: true }
        );

        if (!service) return res.status(404).json({ message: "Không tìm thấy dịch vụ hoặc bạn không có quyền" });
        res.json(service);
    } catch (error) {
        res.status(400).json({ message: "Cập nhật thất bại", error: error.message });
    }
};

// @desc    Ẩn dịch vụ (Soft Delete)
// @route   PATCH /api/services/:id/hide
export const hideService = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ message: "Không tìm thấy Salon" });

        const service = await Service.findOneAndUpdate(
            { _id: req.params.id, salonId: mySalon._id },
            { isActive: false },
            { new: true }
        );

        if (!service) return res.status(404).json({ message: "Không tìm thấy dịch vụ" });
        res.json({ message: "Đã ẩn dịch vụ thành công", service });
    } catch (error) {
        res.status(500).json({ message: "Lỗi hệ thống", error: error.message });
    }
};