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
                message: 'Please provide full name, email, and password for the staff member.'
            });
        }

        // Chuẩn hóa email
        const normalizedEmail = email.toLowerCase().trim();

        // === KIỂM TRA EMAIL ĐÃ TỒN TẠI CHƯA ===
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(400).json({
                message: 'This email is already in use by another account (customer, admin, or staff). Please use a different email.'
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
                message: 'Salon not found. Please create a salon before adding staff.'
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
            'Welcome to Boms Salon!',
            `Hello ${fullName},\n\n` +
            `You have been added as a staff member at our salon.\n\n` +
            `Login details:\n` +
            `Email: ${normalizedEmail}\n` +
            `Password: ${password}\n\n` +
            `Please log in and change your password immediately to secure your account.\n\n` +
            `Best regards,\nBoms Salon Team`,
            `<h3>Welcome ${fullName}!</h3>` +
            `<p>You have been added as a staff member at <strong>Boms Salon</strong>.</p>` +
            `<p><strong>Login details:</strong></p>` +
            `<ul>` +
            `<li>Email: <strong>${normalizedEmail}</strong></li>` +
            `<li>Password: <strong>${password}</strong></li>` +
            `</ul>` +
            `<p style="color: red; font-weight: bold;">Please change your password immediately after your first login!</p>` +
            `<p>Best regards,<br/>Boms Salon Team</p>`
        );

        res.status(201).json({
            success: true,
            message: 'Staff created successfully',
            staff,
            note: 'Password has been sent to the staff via email'
        });

    } catch (error) {
        console.error('[CREATE STAFF ERROR]', error);
        res.status(500).json({
            message: error.message || 'Server error while creating staff'
        });
    }
};

// @desc    Lấy danh sách nhân viên của salon hiện tại
// @route   GET /api/staffs
// @access  Private/SALON_OWNER
export const getStaffs = async (req, res) => {
    try {
        let salonId;

        if (req.user.role === 'SALON_OWNER') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            if (!salon) {
                return res.status(404).json({ message: 'Salon not found' });
            }
            salonId = salon._id;
        } else if (req.user.role === 'STAFF') {
            const staffRecord = await Staff.findOne({ userId: req.user._id });
            if (!staffRecord) {
                return res.status(404).json({ message: 'Staff record not found' });
            }
            salonId = staffRecord.salonId;
        } else {
            return res.status(403).json({ message: 'Unauthorized role' });
        }

        const staffs = await Staff.find({ salonId, isActive: true })
            .populate('userId', 'fullName email phone avatar')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: staffs.length,
            data: staffs
        });
    } catch (error) {
        console.error('[GET STAFFS ERROR]', error);
        res.status(500).json({ message: error.message || 'Server error' });
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
            return res.status(404).json({ message: 'Staff not found or does not belong to your salon' });
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
            return res.status(404).json({ message: 'Salon not found' });
        }

        // 2. Tìm nhân viên thuộc salon đó
        const staff = await Staff.findOne({ _id: staffId, salonId: salon._id });
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found or does not belong to this salon' });
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
            message: 'Staff updated successfully',
            data: staff
        });
    } catch (error) {
        console.error('[UPDATE STAFF PROFILE ERROR]', error);
        res.status(500).json({ message: error.message || 'Server error' });
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
            return res.status(404).json({ message: 'Salon not found' });
        }

        // 2. Tìm staff
        const staff = await Staff.findOne({ _id: staffId, salonId: salon._id });
        if (!staff) {
            return res.status(404).json({ message: 'Staff not found' });
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
                ? 'Staff reactivated successfully'
                : 'Staff deactivated successfully (history preserved)',
            data: { _id: staff._id, isActive: newStatus }
        });

    } catch (error) {
        console.error('[DELETE/TOGGLE STAFF ERROR]', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái nhân viên' });
    }
};

// @desc    Lấy danh sách nhân viên public theo salon
// @route   GET /api/staffs/public/:salonId
// @access  Public
// for booking LocPNG
export const getPublicStaffsBySalon = async (req, res) => {
    try {
        const staffs = await Staff.find({
            salonId: req.params.salonId,
            isActive: true
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: staffs.length,
            data: staffs
        });
    } catch (error) {
        console.error('[GET PUBLIC STAFFS ERROR]', error);
        res.status(500).json({ message: error.message || 'Server error' });
    }
};