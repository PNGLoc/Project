import User from '../models/User.js';
import Salon from '../models/Salon.js';
import Appointment from '../models/Appointment.js';
import Category from '../models/Category.js';

// @desc    Get all admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
    try {
        const revenueAgg = await Appointment.aggregate([
            { $match: { status: 'COMPLETED', paymentStatus: 'PAID' } },
            { $group: { _id: null, total: { $sum: '$totalPrice' } } }
        ]);
        const totalRevenue = revenueAgg[0]?.total || 0;

        const activeSalons = await Salon.countDocuments({ isApproved: true });
        // Update totalUsers to include all roles
        const totalUsers = await User.countDocuments({ role: { $in: ['CUSTOMER', 'SALON_OWNER', 'STAFF'] } });

        const now = new Date();
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);



        // Tính Platform Growth dựa trên số lượng booking hoàn thành mới (doanh thu thực tế)
        const thisMonthBookings = await Appointment.countDocuments({
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            createdAt: { $gte: startOfThisMonth }
        });
        const lastMonthBookings = await Appointment.countDocuments({
            status: 'COMPLETED',
            paymentStatus: 'PAID',
            createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth }
        });

        let growth = 0;
        if (lastMonthBookings > 0) {
            growth = ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100;
        } else if (thisMonthBookings > 0) {
            growth = 100;
        }


        // User roles distribution (for PieChart: { name, value })
        const userRoles = await User.aggregate([
            { $match: { role: { $in: ['CUSTOMER', 'SALON_OWNER', 'STAFF'] } } },
            { $group: { _id: "$role", count: { $sum: 1 } } },
            { $project: { _id: 0, name: "$_id", value: "$count" } }
        ]);

        res.json({
            success: true,
            data: { totalRevenue, activeSalons, totalUsers, platformGrowth: parseFloat(growth.toFixed(1)), userRoles }
        });
    } catch (error) {
        console.error('[ADMIN STATS ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get chart data
// @route   GET /api/admin/charts
// @access  Private/Admin
export const getChartData = async (req, res) => {
    try {
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Revenue chart by month
        const revenueChart = await Appointment.aggregate([
            { $match: { status: 'COMPLETED', paymentStatus: 'PAID', createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, revenue: { $sum: "$totalPrice" } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        // Build full 6-month array with 0s for missing months
        const revenueData = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const found = revenueChart.find(r => r._id.month === m && r._id.year === y);
            revenueData.push({ name: months[m - 1], revenue: found?.revenue || 0 });
        }

        // Commission = 10% of revenue
        const revenueWithCommission = revenueData.map(r => ({
            name: r.name,
            revenue: r.revenue,
            commission: Math.round(r.revenue * 0.1)
        }));

        // Categories
        const categories = await Category.aggregate([
            { $group: { _id: "$name", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const categoryData = categories.map(c => ({ name: c._id, value: c.count }));


        // User growth by month (all roles)
        const userGrowthChart = await User.aggregate([
            { $match: { role: { $in: ['CUSTOMER', 'SALON_OWNER', 'STAFF'] }, createdAt: { $gte: sixMonthsAgo } } },
            { $group: { _id: { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }, users: { $sum: 1 } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const userGrowthData = [];
        let cumulative = 0;
        const baseTotalUsers = await User.countDocuments({ role: { $in: ['CUSTOMER', 'SALON_OWNER', 'STAFF'] }, createdAt: { $lt: sixMonthsAgo } });
        cumulative = baseTotalUsers;

        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const m = d.getMonth() + 1;
            const y = d.getFullYear();
            const found = userGrowthChart.find(r => r._id.month === m && r._id.year === y);
            cumulative += found?.users || 0;
            userGrowthData.push({ name: months[m - 1], users: cumulative });
        }

        res.json({ success: true, data: { revenueData: revenueWithCommission, categoryData, userGrowthData } });
    } catch (error) {
        console.error('[ADMIN CHARTS ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get recent activity
// @route   GET /api/admin/activity
// @access  Private/Admin
export const getRecentActivity = async (req, res) => {
    try {
        const recentSalons = await Salon.find().sort({ createdAt: -1 }).limit(3).lean();
        const recentAppointments = await Appointment.find().sort({ createdAt: -1 }).limit(3).lean();
        const recentUsers = await User.find({ role: 'CUSTOMER' }).sort({ createdAt: -1 }).limit(3).lean();

        const activities = [
            ...recentSalons.map(s => ({
                type: 'New Salon', message: `${s.name} registered`, time: s.createdAt, color: 'blue'
            })),
            ...recentAppointments.map(a => ({
                type: 'Booking', message: `New booking worth ${a.totalPrice?.toLocaleString('vi-VN')} VND`, time: a.createdAt, color: 'green'
            })),
            ...recentUsers.map(u => ({
                type: 'User', message: `${u.fullName} registered`, time: u.createdAt, color: 'purple'
            }))
        ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);

        res.json({ success: true, data: activities });
    } catch (error) {
        console.error('[ADMIN ACTIVITY ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
