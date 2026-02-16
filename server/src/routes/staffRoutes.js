import express from 'express';
import {
    createStaff,
    getStaffs,
    getPublicStaffsBySalon,
    updateStaffSkills,
    updateStaffProfile,
    deleteStaff // 1. BỔ SUNG IMPORT NÀY
} from '../controllers/staffController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Staff routes đang hoạt động!' });
});

// Public route: lấy danh sách staff theo salon (booking)
router.get('/public/:salonId', getPublicStaffsBySalon);

// Chặn các route bên dưới chỉ cho OWNER
router.use(protect, authorize('SALON_OWNER'));

// Route chính: /api/staffs (Tạo & Lấy danh sách)
router.route('/')
    .post(createStaff)
    .get(getStaffs);

// 2. GOM CÁC ROUTE CÙNG ID VÀO MỘT CHỖ CHO GỌN
router.route('/:id')
    .put(updateStaffProfile)   // Sửa thông tin
    .delete(deleteStaff);      // Xóa (Vô hiệu hóa)

// Route cập nhật Skills riêng: /api/staffs/:id/skills
router.put('/:id/skills', updateStaffSkills);

export default router;