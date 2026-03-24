import User from '../models/User.js';
import Salon from '../models/Salon.js';
import Appointment from '../models/Appointment.js';
import Category from '../models/Category.js';
import CommissionRate from '../models/CommissionRate.js';
import CommissionTransaction from '../models/CommissionTransaction.js';

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

const normalizePercent = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(numeric.toFixed(2));
};

// @desc    Get current commission config
// @route   GET /api/admin/commission-config
// @access  Private/Admin
export const getCommissionConfig = async (req, res) => {
    try {
        const currentConfig = await CommissionRate.findOne()
            .sort({ createdAt: -1 })
            .populate('updatedBy', 'fullName email');

        if (!currentConfig) {
            return res.json({
                success: true,
                data: {
                    commissionPercent: 10,
                    hasConfig: false
                }
            });
        }

        res.json({
            success: true,
            data: {
                _id: currentConfig._id,
                commissionPercent: currentConfig.commissionPercent,
                previousPercent: currentConfig.previousPercent,
                updatedBy: currentConfig.updatedBy,
                updatedAt: currentConfig.createdAt,
                hasConfig: true
            }
        });
    } catch (error) {
        console.error('[ADMIN COMMISSION CONFIG ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update commission config (append-only)
// @route   PUT /api/admin/commission-config
// @access  Private/Admin
export const updateCommissionConfig = async (req, res) => {
    try {
        const { commissionPercent } = req.body;
        const normalizedPercent = normalizePercent(commissionPercent);

        if (normalizedPercent === null || normalizedPercent < 0 || normalizedPercent > 100) {
            return res.status(400).json({
                success: false,
                message: 'Commission percent must be a number between 0 and 100'
            });
        }

        const latestConfig = await CommissionRate.findOne().sort({ createdAt: -1 });
        const previousPercent = latestConfig ? latestConfig.commissionPercent : null;

        if (previousPercent !== null && previousPercent === normalizedPercent) {
            return res.status(400).json({
                success: false,
                message: 'New commission percent must be different from current value'
            });
        }

        const newConfig = await CommissionRate.create({
            commissionPercent: normalizedPercent,
            previousPercent,
            updatedBy: req.user._id
        });

        const populated = await CommissionRate.findById(newConfig._id).populate('updatedBy', 'fullName email');

        res.json({
            success: true,
            message: 'Commission config updated successfully',
            data: {
                _id: populated._id,
                oldValue: previousPercent,
                newValue: populated.commissionPercent,
                updatedBy: populated.updatedBy,
                updatedAt: populated.createdAt
            }
        });
    } catch (error) {
        console.error('[ADMIN UPDATE COMMISSION ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get commission history
// @route   GET /api/admin/commission-history
// @access  Private/Admin
export const getCommissionHistory = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            updatedBy = '',
            from = '',
            to = ''
        } = req.query;

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);

        const query = {};

        if (updatedBy) {
            query.updatedBy = updatedBy;
        }

        if (from || to) {
            query.createdAt = {};
            if (from) query.createdAt.$gte = new Date(from);
            if (to) query.createdAt.$lte = new Date(to);
        }

        if (search?.trim()) {
            const searchRegex = new RegExp(search.trim(), 'i');
            const matchedUsers = await User.find({
                $or: [{ fullName: searchRegex }, { email: searchRegex }]
            }).select('_id');

            const userIds = matchedUsers.map((u) => u._id);
            const numericSearch = Number(search);
            const roundedNumeric = Number.isFinite(numericSearch)
                ? Number(numericSearch.toFixed(2))
                : null;

            query.$or = [
                ...(Number.isFinite(roundedNumeric)
                    ? [{ commissionPercent: roundedNumeric }, { previousPercent: roundedNumeric }]
                    : []),
                ...(userIds.length > 0 ? [{ updatedBy: { $in: userIds } }] : [])
            ];
        }

        const total = await CommissionRate.countDocuments(query);
        const history = await CommissionRate.find(query)
            .sort({ createdAt: -1 })
            .skip((parsedPage - 1) * parsedLimit)
            .limit(parsedLimit)
            .populate('updatedBy', 'fullName email');

        res.json({
            success: true,
            data: history.map((item) => ({
                _id: item._id,
                oldValue: item.previousPercent,
                newValue: item.commissionPercent,
                updatedBy: item.updatedBy,
                updatedAt: item.createdAt
            })),
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.ceil(total / parsedLimit) || 1
            }
        });
    } catch (error) {
        console.error('[ADMIN COMMISSION HISTORY ERROR]', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get commission transactions
// @route   GET /api/admin/commission-transactions
// @access  Private/Admin
export const getCommissionTransactions = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            paymentMethod = '',
            from = '',
            to = ''
        } = req.query;

        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(parseInt(limit, 10) || 10, 1);
        const query = {};

        if (paymentMethod && ['CASH', 'VNPAY', 'WALLET'].includes(paymentMethod)) {
            query.paymentMethod = paymentMethod;
        }

        if (from || to) {
            query.paidAt = {};
            if (from) query.paidAt.$gte = new Date(from);
            if (to) query.paidAt.$lte = new Date(to);
        }

        if (search?.trim()) {
            const regex = new RegExp(search.trim(), 'i');

            const [matchedSalons, matchedCustomers, matchedAppointments] = await Promise.all([
                Salon.find({ name: regex }).select('_id'),
                User.find({ $or: [{ fullName: regex }, { email: regex }] }).select('_id'),
                Appointment.find({
                    $or: [
                        { 'serviceSnapshot.name': regex },
                        { 'salonSnapshot.name': regex }
                    ]
                }).select('_id')
            ]);

            const salonIds = matchedSalons.map((item) => item._id);
            const customerIds = matchedCustomers.map((item) => item._id);
            const appointmentIds = matchedAppointments.map((item) => item._id);

            query.$or = [
                ...(salonIds.length > 0 ? [{ salonId: { $in: salonIds } }] : []),
                ...(customerIds.length > 0 ? [{ customerId: { $in: customerIds } }] : []),
                ...(appointmentIds.length > 0 ? [{ appointmentId: { $in: appointmentIds } }] : [])
            ];
        }

        const total = await CommissionTransaction.countDocuments(query);
        const items = await CommissionTransaction.find(query)
            .sort({ paidAt: -1 })
            .skip((parsedPage - 1) * parsedLimit)
            .limit(parsedLimit)
            .populate('appointmentId', 'serviceSnapshot salonSnapshot')
            .populate('salonId', 'name')
            .populate('customerId', 'fullName email');

        const data = items.map((item) => ({
            _id: item._id,
            appointmentId: item.appointmentId?._id || null,
            salonName: item.salonId?.name || item.appointmentId?.salonSnapshot?.name || '-',
            customerName: item.customerId?.fullName || '-',
            customerEmail: item.customerId?.email || '-',
            serviceName: item.appointmentId?.serviceSnapshot?.name || '-',
            grossAmount: item.grossAmount,
            commissionPercent: item.commissionPercent,
            systemAmount: item.systemAmount,
            salonAmount: item.salonAmount,
            paymentMethod: item.paymentMethod,
            paidAt: item.paidAt
        }));

        res.json({
            success: true,
            data,
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.ceil(total / parsedLimit) || 1
            }
        });
    } catch (error) {
        console.error('[ADMIN COMMISSION TRANSACTION ERROR]', error);
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

        const latestCommission = await CommissionRate.findOne().sort({ createdAt: -1 });
        const commissionPercent = latestCommission?.commissionPercent ?? 10;

        // Commission follows configured percentage
        const revenueWithCommission = revenueData.map(r => ({
            name: r.name,
            revenue: r.revenue,
            commission: Math.round(r.revenue * (commissionPercent / 100))
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

        res.json({
            success: true,
            data: {
                revenueData: revenueWithCommission,
                categoryData,
                userGrowthData,
                commissionPercent
            }
        });
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
