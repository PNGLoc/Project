import Service from '../models/Service.js';
import Salon from '../models/Salon.js'; // Đảm bảo import model Salon
import { getMySalon } from './salonController.js';

// @desc    Lấy danh sách dịch vụ của chủ salon
// @route   GET /api/services/owner
export const getMyServices = async (req, res) => {
    try {
        // Tìm tất cả Salon của user này phòng trường hợp có dữ liệu cũ/trùng hoặc ID thay đổi
        const mySalons = await Salon.find({ ownerId: req.user._id });

        if (!mySalons || mySalons.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Bạn chưa đăng ký Salon nào hoặc Salon chưa được liên kết với tài khoản này."
            });
        }

        const salonIds = mySalons.map(s => s._id);

        // Tìm tất cả dịch vụ thuộc về bất kỳ Salon nào mà User này sở hữu, kèm theo thông tin chi tiết các món trong combo
        const services = await Service.find({ salonId: { $in: salonIds } })
            .populate('comboItems', 'name price duration')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: services.length,
            data: services
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách: " + error.message });
    }
};

// @desc    Tạo dịch vụ mới
// @route   POST /api/services/create
export const createService = async (req, res) => {
    try {
        const { name, price, duration, description, categoryId, type, comboItems } = req.body;
        const mySalon = await getMySalon(req.user._id);

        if (!mySalon) {
            return res.status(404).json({ message: "Bạn phải tạo thông tin Salon trước!" });
        }

        const service = new Service({
            name,
            price: Number(price),
            duration: Number(duration),
            description,
            categoryId: categoryId || null,
            salonId: mySalon._id, // Gán ID của Salon
            type: type || 'SINGLE',
            comboItems: comboItems || [],
            isActive: true
        });

        const createdService = await service.save();
        res.status(201).json({
            success: true,
            data: createdService
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
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

        if (!service) return res.status(404).json({ success: false, message: "Không tìm thấy dịch vụ hoặc bạn không có quyền" });
        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        res.status(400).json({ success: false, message: "Cập nhật thất bại", error: error.message });
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

// @desc    Lấy danh sách dịch vụ public theo salon
// @route   GET /api/services/salon/:salonId
// for booking LocPNG
export const getPublicServicesBySalon = async (req, res) => {
    try {
        const services = await Service.find({
            salonId: req.params.salonId,
            isActive: true
        })
            .populate('comboItems', 'name price duration')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: services.length,
            data: services
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};