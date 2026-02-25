import User from '../models/User.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import PendingUser from '../models/PendingUser.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Salon from '../models/Salon.js';
import path from 'path';
import fs from 'fs';

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h',
    });
};

// Helper to send email
const sendEmail = async (to, subject, text, html) => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS.replace(/\s+/g, ''),
        },
    });

    const mailOptions = {
        from: '"Boms" <' + process.env.EMAIL_USER + '>',
        to,
        subject,
        text,
        html,
    };

    await transporter.sendMail(mailOptions);
};

const buildUserResponse = (user, message) => ({
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    dateOfBirth: user.dateOfBirth,
    createdAt: user.createdAt,
    token: generateToken(user._id),
    ...(message ? { message } : {}),
});


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        // 1. Check if user already exists in main User collection
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // 2. Check if phone exists (for verified users in main collection)
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
            return res.status(400).json({ message: 'Phone number already in use' });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // OTP expires in 3 minutes
        const otpExpires = Date.now() + 3 * 60 * 1000;

        // 3. Save to PendingUser (temporary storage)
        let pendingUser = await PendingUser.findOne({ email });

        if (pendingUser) {
            // Update existing pending registration
            pendingUser.fullName = fullName;
            pendingUser.password = password; // Pre-save hook not on this model, will hash below if needed or hash manually
            pendingUser.phone = phone;
            pendingUser.verificationToken = otpCode;
            pendingUser.otpExpires = otpExpires;
        } else {
            // Create new pending registration
            pendingUser = new PendingUser({
                fullName,
                email,
                password,
                phone,
                verificationToken: otpCode,
                otpExpires,
            });
        }

        // Hash password for PendingUser since it doesn't have the pre-save hook of User model
        const salt = await bcrypt.genSalt(10);
        pendingUser.password = await bcrypt.hash(password, salt);

        await pendingUser.save();

        // Send email
        await sendEmail(
            email,
            'Account Verification OTP',
            `Your verification code is: ${otpCode}. It expires in 3 minutes.`,
            `<h3>Your verification code is: <b>${otpCode}</b></h3><p>It expires in 3 minutes.</p>`
        );

        console.log(`[REGISTRATION PENDING] OTP sent to ${email}: ${otpCode}`);

        res.status(201).json({
            message: 'Registration initiated. Please check email for OTP.',
            email: email
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @access  Public
export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Please provide email and OTP' });
        }

        // 1. Find the pending registration
        const pendingUser = await PendingUser.findOne({ email });

        if (!pendingUser) {
            return res.status(404).json({ message: 'Registration not found or expired. Please register again.' });
        }

        // 2. Validate OTP
        if (pendingUser.verificationToken !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (pendingUser.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // 3. Create real User in User collection
        const user = await User.create({
            fullName: pendingUser.fullName,
            email: pendingUser.email,
            password: pendingUser.password, // This is already hashed from register step
            phone: pendingUser.phone,
            isVerified: true,
        });

        // 4. Delete pending registration
        await PendingUser.deleteOne({ _id: pendingUser._id });

        res.status(200).json({
            message: 'Email verified successfully. You can now login.',
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check for user email
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // Check if verified
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email first' });
        }

        // Check if active (soft delete)
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is disabled. Please contact admin.' });
        }

        // --- CHÈN THÊM ĐOẠN NÀY ĐỂ GIỮ TRẠNG THÁI CHỜ DUYỆT ---
        const salon = await Salon.findOne({ ownerId: user._id });
        // ---------------------------------------------------

        res.json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            token: generateToken(user._id),
            // Trả thêm salonId về để lưu vào localStorage
            salonId: salon ? salon._id : null
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Login/Register using Google OAuth
// @route   POST /api/auth/google
// @access  Public
export const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({ message: 'Missing Google credential' });
        }

        // Verify Google token
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Check if user exists
        let user = await User.findOne({ email }).select('+password');

        if (!user) {
            // User does not exist, create a new one natively
            // Generate a random, highly secure password to bypass Mongoose validation
            const randomPassword = 'Google_Login@123!' + Math.random().toString(36).slice(-8) + 'Xy';

            user = await User.create({
                fullName: name,
                email: email,
                password: randomPassword,
                phone: `0000000000`, // Default dummy phone, matching regex ^0\d{9}$
                isVerified: true,    // Google emails are already verified
                avatar: picture,
                role: 'CUSTOMER'     // Default role
            });
        } else {
            // If user exists but is not verified, verify them since Google vouches for the email
            if (!user.isVerified) {
                user.isVerified = true;
                await user.save();
            }
        }

        // Check if active (soft delete)
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is disabled. Please contact admin.' });
        }

        const salon = await Salon.findOne({ ownerId: user._id });

        res.json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            token: generateToken(user._id),
            salonId: salon ? salon._id : null
        });

    } catch (error) {
        console.error('[GOOGLE LOGIN ERROR]', error);
        res.status(500).json({ message: 'Failed to authenticate with Google' });
    }
};
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Email not found' });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // OTP expires in 3 minute
        const resetExpires = Date.now() + 3 * 60 * 1000;

        // Save to DB
        user.resetPasswordToken = otpCode;
        user.resetPasswordExpire = resetExpires;
        await user.save();

        // Send Email
        await sendEmail(
            email,
            'Password Reset OTP',
            `Your password reset code is: ${otpCode}. It expires in 3 minutes.`,
            `<h3>Your password reset code is: <b>${otpCode}</b></h3><p>It expires in 3 minutes.</p>`
        );

        res.status(200).json({ message: 'OTP sent to email' });

    } catch (error) {
        console.error('[FORGOT PASSWORD ERROR]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Reset Password - Verify OTP & Update Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({
            email,
            resetPasswordToken: otp,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid OTP or OTP expired' });
        }

        // Update Password
        user.password = newPassword; // Pre-save middleware will hash this
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ message: 'Password updated successfully. Please login.' });

    } catch (error) {
        console.error('[RESET PASSWORD ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            res.json({
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                avatar: user.avatar,
                bio: user.bio,
                dateOfBirth: user.dateOfBirth,
                createdAt: user.createdAt,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            user.fullName = req.body.fullName || user.fullName;
            user.phone = req.body.phone || user.phone;
            user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
            if (req.body.dateOfBirth) {
                user.dateOfBirth = req.body.dateOfBirth;
            }
            if (req.body.avatar) {
                user.avatar = req.body.avatar;
            }

            const updatedUser = await user.save();

            res.json(buildUserResponse(updatedUser, 'Profile updated successfully'));
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id).select('+password');

        if (user && (await user.matchPassword(currentPassword))) {
            user.password = newPassword;
            await user.save();
            res.json({ message: 'Password changed successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        console.error(error);
        // Return 400 for validation errors (like weak password)
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Update avatar image
// @route   PUT /api/auth/avatar
// @access  Private
export const updateAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No avatar file uploaded' });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            // Cleanup uploaded file if user not found
            try {
                fs.unlinkSync(req.file.path);
            } catch {
                // ignore
            }
            return res.status(404).json({ message: 'User not found' });
        }

        // Optionally remove old avatar file if it was stored in assets
        if (user.avatar && typeof user.avatar === 'string' && user.avatar.startsWith('/assets/avatars/')) {
            const oldPath = path.resolve(process.cwd(), '../client/public', user.avatar.replace(/^\//, ''));
            if (fs.existsSync(oldPath)) {
                try {
                    fs.unlinkSync(oldPath);
                } catch {
                    // ignore cleanup error
                }
            }
        }

        const relativePath = `/assets/avatars/${req.file.filename}`;
        user.avatar = relativePath;
        const updatedUser = await user.save();

        res.json(buildUserResponse(updatedUser, 'Avatar updated successfully'));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Please provide email' });
        }

        // Check if user is already verified in main collection
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'Account already verified' });
        }

        const pendingUser = await PendingUser.findOne({ email });

        if (!pendingUser) {
            return res.status(404).json({ message: 'Registration not found. Please register again.' });
        }

        // Generate new 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // OTP expires in 3 minutes
        const otpExpires = Date.now() + 3 * 60 * 1000;

        pendingUser.verificationToken = otpCode;
        pendingUser.otpExpires = otpExpires;
        await pendingUser.save();

        // Send email
        await sendEmail(
            email,
            'New Account Verification OTP',
            `Your new verification code is: ${otpCode}. It expires in 3 minutes.`,
            `<h3>Your new verification code is: <b>${otpCode}</b></h3><p>It expires in 3 minutes.</p>`
        );

        console.log(`[EMAIL RESEND] New OTP sent to ${email}: ${otpCode}`);

        res.status(200).json({ message: 'New OTP sent to email' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
