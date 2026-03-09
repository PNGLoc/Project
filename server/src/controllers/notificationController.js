import Notification from '../models/Notification.js';

// @desc    Lấy tất cả thông báo của người dùng hiện tại
// @route   GET /api/notifications
// @access  Private
export const getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50);
        
        const unreadCount = await Notification.countDocuments({ 
            recipient: req.user._id, 
            isRead: false 
        });

        res.json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Đánh dấu thông báo là đã đọc
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.json({ success: true, data: notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Đánh dấu tất cả thông báo là đã đọc
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user._id, isRead: false },
            { isRead: true }
        );

        res.json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
