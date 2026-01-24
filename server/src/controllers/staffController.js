// server/src/controllers/staffController.js
import mongoose from 'mongoose';
import User from '../models/User.js';
import Salon from '../models/Salon.js';
import Staff from '../models/Staff.js';
import nodemailer from 'nodemailer';

const sendEmail = async (to, subject, text, html = '') => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
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

export const createStaff = async (req, res) => {
    try {
        let { fullName, email, phone, password, skillIds = [], schedule = [] } = req.body;

        if (!fullName || !email) {
            return res.status(400).json({ message: 'Vui lòng cung cấp họ tên và email' });
        }

        // Require owner to provide a password — do not auto-generate one
        if (!password) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mật khẩu cho nhân viên (không tự sinh mật khẩu).' });
        }

        let user = await User.findOne({ email });
        let isNewUser = false;
        let usedPassword = password; // mật khẩu sẽ dùng để tạo hoặc thông báo

        if (!user) {
            isNewUser = true;

            user = await User.create({
                fullName,
                email,
                password, // sẽ được hash tự động và pass validation vì mạnh
                phone,
                role: 'STAFF',
                isVerified: true,
                isActive: true,
            });
        } else {
            // Nếu user đã tồn tại, chỉ cập nhật thông tin (không đổi password nếu không gửi)
            if (user.role !== 'STAFF') user.role = 'STAFF';
            user.fullName = fullName;
            if (phone) user.phone = phone;
            user.isActive = true;

            // Nếu chủ tiệm gửi password mới → cập nhật luôn
            if (password) {
                user.password = password; // pre-save sẽ hash
            }

            await user.save();
            // Nếu user cũ và không gửi password mới → không cần thông báo password
            usedPassword = null;
        }

        // === TẠM BỎ KIỂM TRA SALON (cho test) ===
        const tempSalonId = "66f8a1234567890abcdef000"; // thay bằng ID thật khi có

        const existingStaff = await Staff.findOne({ userId: user._id });

        const staff = await Staff.findOneAndUpdate(
            { userId: user._id },
            {
                salonId: tempSalonId,
                userId: user._id,
                fullName,
                skills: skillIds,
                schedule,
                isActive: true,
            },
            { upsert: true, new: true }
        ).populate('skills');

        // Gửi email chỉ khi là user mới HOẶC có password mới
        if (isNewUser || password) {
            await sendEmail(
                email,
                isNewUser ? 'Chào mừng bạn gia nhập salon!' : 'Tài khoản của bạn đã được cập nhật',
                `Thông tin tài khoản nhân viên:\n\n` +
                `Email: ${email}\n` +
                `${usedPassword ? `Mật khẩu: ${usedPassword}\n\n` : ''}` +
                `Vui lòng đăng nhập tại ứng dụng và đổi mật khẩu nếu cần.`,
                `<h3>${isNewUser ? 'Chào mừng bạn!' : 'Cập nhật tài khoản'}</h3>` +
                `<p>Email: <strong>${email}</strong></p>` +
                `${usedPassword ? `<p>Mật khẩu: <strong>${usedPassword}</strong></p>` : ''}` +
                `<p>Vui lòng đăng nhập và đổi mật khẩu để bảo mật.</p>`
            );
        }

        res.status(201).json({
            message: 'Thêm/cập nhật nhân viên thành công',
            staff,
            note: isNewUser ? 'Mật khẩu đã được gửi qua email' : 'Nhân viên đã tồn tại, thông tin được cập nhật',
        });
    } catch (error) {
        console.error('[CREATE STAFF ERROR]', error);
        res.status(500).json({ message: error.message || 'Lỗi server' });
    }
};

// Thêm route GET danh sách staff của salon (cho frontend)
export const getStaffs = async (req, res) => {
    try {
        const ownerId = req.user._id;
        const salon = await Salon.findOne({ ownerId });
        if (!salon) {
            return res.status(404).json({ message: 'Không tìm thấy salon' });
        }

        const staffs = await Staff.find({ salonId: salon._id })
            .populate('userId', 'email phone avatar') // lấy thêm info từ User
            .populate('skills', 'name price') // nếu cần tên dịch vụ
            .sort({ createdAt: -1 });

        res.json({ staffs });
    } catch (error) {
        console.error('[GET STAFFS ERROR]', error);
        res.status(500).json({ message: error.message });
    }
};