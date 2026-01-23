import User from '../models/User.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

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

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const { fullName, email, password, phone } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        // OTP expires in 10 minutes
        const otpExpires = Date.now() + 10 * 60 * 1000;

        // Create user
        const user = await User.create({
            fullName,
            email,
            password,
            phone,
            verificationToken: otpCode,
            otpExpires,
        });

        if (user) {
            // Send email
            await sendEmail(
                email,
                'Account Verification OTP',
                `Your verification code is: ${otpCode}. It expires in 10 minutes.`,
                `<h3>Your verification code is: <b>${otpCode}</b></h3><p>It expires in 10 minutes.</p>`
            );

            console.log(`[EMAIL SEND] OTP sent to ${email}: ${otpCode}`);

            res.status(201).json({
                _id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                message: 'User registered. Please check email for OTP.',
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
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

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        if (user.verificationToken !== otp) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'OTP expired' });
        }

        // Verify user
        user.isVerified = true;
        user.verificationToken = undefined;
        user.otpExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully. You can now login.' });
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
            return res.status(401).json({ message: 'Email not found' });
        }

        // Check if password matches
        const isMatch = await user.matchPassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect password' });
        }

        // Check if verified
        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email first' });
        }

        // Check if active (soft delete)
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is disabled. Please contact admin.' });
        }

        res.json({
            _id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            token: generateToken(user._id),
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Forgot Password - Send OTP
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
        // OTP expires in 10 minutes
        const resetExpires = Date.now() + 10 * 60 * 1000;

        // Save to DB
        user.resetPasswordToken = otpCode;
        user.resetPasswordExpire = resetExpires;
        await user.save();

        // Send Email
        await sendEmail(
            email,
            'Password Reset OTP',
            `Your password reset code is: ${otpCode}. It expires in 10 minutes.`,
            `<h3>Your password reset code is: <b>${otpCode}</b></h3><p>It expires in 10 minutes.</p>`
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
