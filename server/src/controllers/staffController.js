// server/src/controllers/staffController.js
import User from '../models/User.js';
import Salon from '../models/Salon.js';
import Staff from '../models/Staff.js';
import nodemailer from 'nodemailer';

// Cấu hình gửi email
const sendEmail = async (to, subject, text, html = '') => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS.replace(/\s+/g, ''),
        },
    });

    await transporter.sendMail({
        from: `"Boms Salon" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html: html || text,
    });
};

// @desc    Tạo hoặc cập nhật nhân viên (chỉ owner mới được gọi)
// @route   POST /api/staffs/register hoặc tương tự
// @access  Private/SALON_OWNER
export const createStaff = async (req, res) => {
    try {
        const { fullName, email, phone = '', password, skills = [], schedule = [] } = req.body;

        // Validate bắt buộc
        if (!fullName || !email || !password) {
            return res.status(400).json({
                message: 'Vui lòng cung cấp đầy đủ: họ tên, email và mật khẩu cho nhân viên'
            });
        }

        // Chuẩn hóa email
        const normalizedEmail = email.toLowerCase().trim();

        // === KIỂM TRA EMAIL ĐÃ TỒN TẠI CHƯA ===
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: 'Email này đã được sử dụng trong hệ thống (khách hàng, admin hoặc nhân viên khác). Vui lòng dùng email khác.'
            });
        }

        // === TẠO USER MỚI VỚI ROLE STAFF ===
        const user = await User.create({
            fullName: fullName.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password, // sẽ được hash tự động trong pre-save hook
            role: 'STAFF',
            isVerified: true, // owner tạo nên xác thực luôn
            isActive: true,
        });

        // === LẤY SALON CỦA OWNER ĐANG ĐĂNG NHẬP ===
        const salon = await Salon.findOne({ ownerId: req.user._id });

        if (!salon) {
            return res.status(404).json({
                message: 'Không tìm thấy salon của bạn. Vui lòng tạo salon trước khi thêm nhân viên.'
            });
        }

        // === TẠO HOẶC CẬP NHẬT BẢN GHI STAFF ===
        const staff = await Staff.findOneAndUpdate(
            { userId: user._id },
            {
               salonId: salon._id,
                userId: user._id,
                fullName: fullName.trim(),
                skills: [], // mảng rỗng, sẽ cập nhật sau
                schedule: [],
                isActive: true,
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // === GỬI EMAIL CHÀO MỪNG + MẬT KHẨU ===
        await sendEmail(
            normalizedEmail,
            'Chào mừng bạn gia nhập đội ngũ Boms Salon!',
            `Chào ${fullName},\n\n` +
            `Bạn đã được thêm làm nhân viên tại salon.\n\n` +
            `Thông tin đăng nhập:\n` +
            `Email: ${normalizedEmail}\n` +
            `Mật khẩu: ${password}\n\n` +
            `Vui lòng đăng nhập ngay và đổi mật khẩu để bảo mật tài khoản.\n\n` +
            `Trân trọng,\nĐội ngũ Boms Salon`,
            `<h3>Chào mừng ${fullName}!</h3>` +
            `<p>Bạn đã được thêm vào làm nhân viên tại <strong>Boms Salon</strong>.</p>` +
            `<p><strong>Thông tin đăng nhập:</strong></p>` +
            `<ul>` +
            `<li>Email: <strong>${normalizedEmail}</strong></li>` +
            `<li>Mật khẩu: <strong>${password}</strong></li>` +
            `</ul>` +
            `<p style="color: red; font-weight: bold;">Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu!</p>` +
            `<p>Trân trọng,<br/>Đội ngũ Boms Salon</p>`
        );

        res.status(201).json({
            success: true,
            message: 'Thêm nhân viên thành công',
            staff,
            note: 'Mật khẩu đã được gửi qua email cho nhân viên'
        });

    } catch (error) {
        console.error('[CREATE STAFF ERROR]', error);
        res.status(500).json({
            message: error.message || 'Lỗi server khi thêm nhân viên'
        });
    }
};

// @desc    Lấy danh sách nhân viên của salon hiện tại
// @route   GET /api/staffs
// @access  Private/SALON_OWNER
export const getStaffs = async (req, res) => {
    try {
        const salon = await Salon.findOne({ ownerId: req.user._id });
        if (!salon) {
            return res.status(404).json({ message: 'Không tìm thấy salon của bạn' });
        }

        const staffs = await Staff.find({ salonId: salon._id })
            .populate('userId', 'fullName email phone avatar')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: staffs.length,
            data: staffs
        });
    } catch (error) {
        console.error('[GET STAFFS ERROR]', error);
        res.status(500).json({ message: error.message || 'Lỗi server' });
    }
};
// @desc    Cập nhật kỹ năng cho nhân viên
// @route   PUT /api/staffs/:id/skills
// @access  Private/SALON_OWNER
export const updateStaffSkills = async (req, res) => {
    try {
        const { skills } = req.body;

        if (!Array.isArray(skills)) {
            return res.status(400).json({ message: 'Skills must be an array' });
        }

        // Tìm staff của salon owner hiện tại
        const salon = await Salon.findOne({ ownerId: req.user._id });
        if (!salon) {
            return res.status(404).json({ message: 'Salon not found' });
        }

        const staff = await Staff.findOneAndUpdate(
            { _id: req.params.id, salonId: salon._id },
            { skills },
            { new: true, runValidators: true }
        );

        if (!staff) {
            return res.status(404).json({ message: 'Staff not found or not belong to your salon' });
        }

        res.json({
            success: true,
            message: 'Skills updated successfully',
            data: staff
        });
    } catch (error) {
        console.error('[UPDATE STAFF SKILLS ERROR]', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};

// @desc    Cập nhật thông tin cá nhân nhân viên
// @route   PUT /api/staffs/:id
// @access  Private/SALON_OWNER
export const updateStaffProfile = async (req, res) => {
    try {
        const { fullName, phone } = req.body;
        const staffId = req.params.id;

        // 1. Tìm salon của chủ sở hữu
        const salon = await Salon.findOne({ ownerId: req.user._id });
        if (!salon) {
            return res.status(404).json({ message: 'Không tìm thấy salon của bạn' });
        }

        // 2. Tìm nhân viên thuộc salon đó
        const staff = await Staff.findOne({ _id: staffId, salonId: salon._id });
        if (!staff) {
            return res.status(404).json({ message: 'Nhân viên không tồn tại hoặc không thuộc salon này' });
        }

        // 3. Cập nhật bảng User (fullName và phone)
        await User.findByIdAndUpdate(staff.userId, {
            fullName: fullName.trim(),
            phone: phone.trim()
        });

        // 4. Cập nhật bảng Staff (fullName)
        staff.fullName = fullName.trim();
        await staff.save();

        res.json({
            success: true,
            message: 'Cập nhật nhân viên thành công',
            data: staff
        });
    } catch (error) {
        console.error('[UPDATE STAFF PROFILE ERROR]', error);
        res.status(500).json({ message: error.message || 'Lỗi server' });
    }
};
// @desc    Vô hiệu hóa/Kích hoạt lại nhân viên (Thay cho xóa vĩnh viễn)
// @route   DELETE /api/staffs/:id (Hoặc đổi thành PUT /api/staffs/:id/status)
export const deleteStaff = async (req, res) => {
    try {
        const staffId = req.params.id;

        // 1. Kiểm tra salon
        const salon = await Salon.findOne({ ownerId: req.user._id });
        if (!salon) {
            return res.status(404).json({ message: 'Không tìm thấy salon' });
        }

        // 2. Tìm staff
        const staff = await Staff.findOne({ _id: staffId, salonId: salon._id });
        if (!staff) {
            return res.status(404).json({ message: 'Nhân viên không tồn tại' });
        }

        // 3. Logic Soft Delete (Đảo ngược trạng thái)
        // Nếu đang Active -> Deactive (Nghỉ việc)
        // Nếu đang Deactive -> Active (Đi làm lại)
        const newStatus = !staff.isActive;

        // Cập nhật bảng Staff
        staff.isActive = newStatus;
        await staff.save();

        // Cập nhật bảng User (Để chặn/cho phép đăng nhập)
        // isActive: false ở bảng User sẽ khiến middleware auth chặn lại
        await User.findByIdAndUpdate(staff.userId, { 
            isActive: newStatus 
        });

        res.json({
            success: true,
            message: newStatus 
                ? 'Đã kích hoạt lại nhân viên thành công' 
                : 'Đã vô hiệu hóa nhân viên (Dữ liệu lịch sử vẫn được giữ)',
            data: { _id: staff._id, isActive: newStatus }
        });

    } catch (error) {
        console.error('[DELETE/TOGGLE STAFF ERROR]', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái nhân viên' });
    }
};