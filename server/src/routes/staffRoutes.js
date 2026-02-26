import express from 'express';
import {
    createStaff,
    getStaffs,
    getPublicStaffsBySalon,
    getStaffDetailPublic,
    updateStaffSkills,
    updateStaffProfile,
    deleteStaff
} from '../controllers/staffController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';
const router = express.Router();
// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Staff routes đang hoạt động!' });
});
// Public route: chi tiết staff (Staff Detail Page)
router.get('/profile/:id', getStaffDetailPublic);
// Public route: lấy danh sách staff theo salon (booking)
router.get('/public/:salonId', getPublicStaffsBySalon);
// Route chính cho STAFF tự xem thông tin của mình
router.get('/me', protect, authorize('STAFF', 'SALON_OWNER'), async (req, res) => {
    try {
        const staff = await import('../models/Staff.js').then(module => module.default.findOne({ userId: req.user._id }));
        if (!staff) {
            return res.status(404).json({ message: 'Staff profile not found' });
        }
        res.json({ success: true, data: [staff] }); // Wrap in array to match frontend expectation
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server error' });
    }
});

// Chặn các route bên dưới chỉ cho OWNER
router.use(protect, authorize('SALON_OWNER'));

// Route chính: /api/staffs (Tạo & Lấy danh sách)
router.route('/')
    .post(authorize('SALON_OWNER'), createStaff)
    .get(authorize('SALON_OWNER', 'STAFF'), getStaffs);

// 2. GOM CÁC ROUTE CÙNG ID VÀO MỘT CHỖ CHO GỌN
router.route('/:id')
    .put(authorize('SALON_OWNER'), updateStaffProfile)   // Sửa thông tin
    .delete(deleteStaff);      // Xóa (Vô hiệu hóa)

// Route cập nhật Skills riêng: /api/staffs/:id/skills
router.put('/:id/skills', updateStaffSkills);

export default router;