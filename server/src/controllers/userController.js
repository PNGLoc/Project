import User from '../models/User.js';

// @desc    Get all users (for admin)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, q, role, isActive } = req.query;

        const filter = {};
        if (q && q.trim()) {
            const regex = new RegExp(q.trim(), 'i');
            filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
        }
        if (role) {
            filter.role = role;
        }
        if (typeof isActive !== 'undefined') {
            if (isActive === 'true' || isActive === 'false') {
                filter.isActive = isActive === 'true';
            }
        }

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = parseInt(limit, 10) || 20;
        const skip = (pageNum - 1) * limitNum;

        const [total, users] = await Promise.all([
            User.countDocuments(filter),
            User.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .select('-password -resetPasswordToken -resetPasswordExpire -verificationToken -otpExpires'),
        ]);

        res.json({
            users,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('[GET USERS ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Get user detail (for admin)
// @route   GET /api/users/:id
// @access  Private/Admin
export const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select(
            '-password -resetPasswordToken -resetPasswordExpire -verificationToken -otpExpires'
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // NOTE: Nếu sau này cần thêm activity history, có thể populate từ collection khác ở đây
        res.json(user);
    } catch (error) {
        console.error('[GET USER DETAIL ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

// @desc    Soft delete / ban user (toggle isActive)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const toggleUserActive = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Không cho admin tự khóa chính mình
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot deactivate your own account' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            message: user.isActive ? 'User reactivated successfully' : 'User deactivated (banned) successfully',
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            },
        });
    } catch (error) {
        console.error('[TOGGLE USER ACTIVE ERROR]', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};


