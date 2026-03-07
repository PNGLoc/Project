import Salon from '../models/Salon.js';
import User from '../models/User.js';
import Service from '../models/Service.js';
import Staff from '../models/Staff.js';
import Category from '../models/Category.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CẤU HÌNH ĐƯỜNG DẪN LƯU VÀO PUBLIC ---

const ROOT_DIR = process.cwd();

const CLIENT_PUBLIC_PATH = path.resolve(__dirname, '../../../client/public');
const TEMP_DIR = path.join(CLIENT_PUBLIC_PATH, 'assets', 'salon', 'temp');
const FINAL_DIR = path.join(CLIENT_PUBLIC_PATH, 'assets', 'salon', 'salons');

console.log("--- KIỂM TRA ĐƯỜNG DẪN ---");
console.log("Nguồn (Temp):", TEMP_DIR);
console.log("Đích (Salons):", FINAL_DIR);

// Hàm bổ trợ để đảm bảo thư mục tồn tại, tránh lỗi khi move file
const ensureExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

// --- 1. Đăng ký ---
export const registerSalon = async (req, res) => {
    try {
        ensureExists(TEMP_DIR);
        const { name, phone, address } = req.body;

        const existingSalon = await Salon.findOne({ ownerId: req.user._id });
        if (existingSalon) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({
                message: "You have already registered a salon."
            });
        }

        let parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;

        const newSalon = new Salon({
            name,
            phone,
            address: parsedAddress,
            // Lưu path tương đối để Frontend dễ gọi
            images: req.file ? [`/assets/salon/temp/${req.file.filename}`] : [],
            ownerId: req.user._id,
            isApproved: false
        });

        await newSalon.save();
        res.status(201).json(newSalon);
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(400).json({ message: error.message });
    }
};

// --- 2. Duyệt ---
export const approveSalon = async (req, res) => {
    try {
        ensureExists(FINAL_DIR); // Đảm bảo folder salons tồn tại trước khi duyệt
        const oldSalon = await Salon.findById(req.params.id);
        if (!oldSalon) return res.status(404).json({ message: "Không tìm thấy" });

        let finalImages = oldSalon.images.map(imagePath => {
            if (imagePath.includes('/temp/')) {
                const fileName = path.basename(imagePath);
                const oldPath = path.join(TEMP_DIR, fileName);
                const newPath = path.join(FINAL_DIR, fileName);

                if (fs.existsSync(oldPath)) {
                    try {
                        fs.renameSync(oldPath, newPath);
                        console.log(`-> Đã chuyển ảnh: ${fileName} sang salons`);
                        return `/assets/salon/salons/${fileName}`;
                    } catch (err) {
                        console.error(`Lỗi khi dời file ${fileName}:`, err);
                        return imagePath; // Lỗi thì giữ nguyên path cũ tránh mất data
                    }
                } else {
                    console.warn(`! Không tìm thấy file tại: ${oldPath}`);
                }
            }
            return imagePath;
        });

        const updatedSalon = await Salon.findByIdAndUpdate(
            req.params.id,
            { isApproved: true, images: finalImages },
            { new: true }
        );
        if (updatedSalon) await User.findByIdAndUpdate(updatedSalon.ownerId, { role: 'SALON_OWNER' });
        res.json({ message: "Approved!", salon: updatedSalon });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 3. Từ chối ---
export const rejectSalon = async (req, res) => {
    try {
        const salon = await Salon.findById(req.params.id);
        if (salon?.images) {
            salon.images.forEach(img => {
                const p = path.join(TEMP_DIR, path.basename(img));
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }
        await Salon.findByIdAndDelete(req.params.id);
        res.json({ message: "Rejected" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




// --- 4. Cập nhật getAllSalons ---
export const getAllSalons = async (req, res) => {
    try {
        const salons = await Salon.find({ isApproved: true }).lean(); // Dùng lean() để dễ thêm thuộc tính mới

        // Lấy danh mục cho từng salon
        const salonsWithCategories = await Promise.all(salons.map(async (salon) => {
            const categories = await Category.find({ salonId: salon._id }).select('name');
            return {
                ...salon,
                categories: categories.map(c => c.name) // Trả về mảng ['Hair', 'Nails']
            };
        }));

        res.json(salonsWithCategories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- 5. Get Pending ---
export const getPendingSalons = async (req, res) => {
    try {
        const salons = await Salon.find({ isApproved: false }).populate('ownerId', 'fullName email');
        res.json(salons);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 6. Get My Salon ---
export const getMySalon = async (userId) => {
    return await Salon.findOne({ ownerId: userId }).sort({ createdAt: -1 });
};

// @desc    Lấy FULL chi tiết salon public (dùng cho View Details)
// @route   GET /api/salons/:id/details
// @access  Public
export const getSalonDetails = async (req, res) => {
    try {
        const salon = await Salon.findById(req.params.id);

        if (!salon || !salon.isApproved) {
            return res.status(404).json({
                success: false,
                message: 'Salon not found or not approved yet'
            });
        }

        // Lấy services và staffs song song
        const [services, staffs] = await Promise.all([
            Service.find({
                salonId: salon._id,
                isActive: true
            }).populate('comboItems', 'name price duration')
                .sort({ createdAt: -1 }),

            Staff.find({
                salonId: salon._id,
                isActive: true
            }).populate('userId', 'fullName email phone avatar')
                .sort({ createdAt: -1 })
        ]);

        res.json({
            success: true,
            data: {
                salon: {
                    _id: salon._id,
                    name: salon.name,
                    description: salon.description || "Premium Hair Salon & Spa", // bạn có thể thêm field description sau
                    phone: salon.phone,
                    address: salon.address,
                    images: salon.images,
                    workingHours: salon.workingHours,
                    rating: salon.rating,
                    reviews: salon.reviews,
                    isApproved: salon.isApproved,
                    // thêm amenities nếu bạn có field sau này
                },
                services,
                staffs
            }
        });
    } catch (error) {
        console.error('[GET SALON DETAILS ERROR]', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// @desc    Lấy dữ liệu thống kê cho Partner Dashboard
// @route   GET /api/salons/dashboard/stats
// @access  Private/SALON_OWNER
export const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Tìm salon của user
        const salon = await Salon.findOne({ ownerId: userId });
        if (!salon) {
            return res.status(404).json({ message: "Salon not found" });
        }

        const mongoose = (await import('mongoose')).default;
        const Appointment = mongoose.model('Appointment');

        // Định nghĩa ngày hiện tại và đầu tuần (Monday)
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        let startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        let endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        // --- Tính toán Total Revenue & Bookings (All time completed/confirmed) ---
        const totalStatsAgg = await Appointment.aggregate([
            { $match: { salonId: salon._id, status: { $in: ['COMPLETED', 'CONFIRMED'] } } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalPrice" },
                    totalBookings: { $sum: 1 }
                }
            }
        ]);
        const totalRevenue = totalStatsAgg[0]?.totalRevenue || 0;
        const totalBookings = totalStatsAgg[0]?.totalBookings || 0;

        // --- Tìm New Customers (Khách mới trong 30 ngày) ---
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const newCustomersAgg = await Appointment.aggregate([
            { $match: { salonId: salon._id, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: { _id: "$customerId" } },
            { $count: "count" }
        ]);
        const newCustomers = newCustomersAgg[0]?.count || 0;

        // --- Tính Average Rating ---
        const avgRating = salon.rating || 0;

        // --- Lấy Today's Schedule ---
        const todayScheduleRaw = await Appointment.find({
            salonId: salon._id,
            startAt: { $gte: startOfDay, $lte: endOfDay }
        })
            .populate('customerId', 'fullName')
            .populate('serviceId', 'name duration')
            .populate('staffId', 'userId')
            .populate({
                path: 'staffId',
                populate: { path: 'userId', select: 'fullName' }
            })
            .sort({ startAt: 1 })
            .limit(10); // Giới hạn 10 appointment cho dashboard

        const todaySchedule = todayScheduleRaw.map(app => {
            const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
            return {
                id: app._id,
                time: new Date(app.startAt).toLocaleTimeString('en-US', timeOptions),
                customer: app.customerId?.fullName || app.staffSnapshot?.fullName || 'Unknown Customer',
                service: app.serviceId?.name || app.serviceSnapshot?.name || 'Deleted Service',
                stylist: app.staffId?.userId?.fullName || 'Unknown Stylist',
                status: app.status.toLowerCase(),
                duration: `${app.serviceId?.duration || app.serviceSnapshot?.duration || 0} min`
            };
        });

        // --- Tính Trends (This Week vs Last Week Revenue/Bookings) TẠM THỜI MOCK +% ---
        // TODO: Real implementation would need full last week aggregation. 
        // For now returning mock % strings for the UI based on real base numbers
        const stats = {
            totalRevenue,
            totalBookings,
            newCustomers,
            avgRating: avgRating.toFixed(1)
        };

        // --- Aggregation cho Biểu đồ Weekly (Monday - Sunday) ---
        const weeklyAgg = await Appointment.aggregate([
            {
                $match: {
                    salonId: salon._id,
                    startAt: { $gte: startOfWeek, $lte: endOfWeek },
                    status: { $in: ['COMPLETED', 'CONFIRMED'] }
                }
            },
            {
                $project: {
                    dayOfWeek: { $isoDayOfWeek: "$startAt" }, // 1 (Mon) - 7 (Sun)
                    totalPrice: 1
                }
            },
            {
                $group: {
                    _id: "$dayOfWeek",
                    revenue: { $sum: "$totalPrice" },
                    bookings: { $sum: 1 }
                }
            }
        ]);

        const daysMap = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

        let revenueData = [];
        let bookingsData = [];

        for (let i = 1; i <= 7; i++) {
            const dayData = weeklyAgg.find(d => d._id === i) || { revenue: 0, bookings: 0 };
            revenueData.push({ name: daysMap[i], revenue: dayData.revenue });
            bookingsData.push({ name: daysMap[i], bookings: dayData.bookings });
        }

        // --- Top Services (Group by service) ---
        const topServicesAgg = await Appointment.aggregate([
            { $match: { salonId: salon._id, status: { $in: ['COMPLETED', 'CONFIRMED'] } } },
            {
                $group: {
                    _id: "$serviceId",
                    bookings: { $sum: 1 },
                    revenue: { $sum: "$totalPrice" },
                    snapshotName: { $first: "$serviceSnapshot.name" }
                }
            },
            { $sort: { bookings: -1 } },
            { $limit: 4 }
        ]);

        // Populate service names via DB
        const topServices = await Promise.all(topServicesAgg.map(async (ts) => {
            let name = ts.snapshotName || 'Unknown Service';
            if (ts._id) {
                const s = await mongoose.model('Service').findById(ts._id).select('name');
                if (s) name = s.name;
            }
            return {
                name,
                bookings: ts.bookings,
                revenue: ts.revenue
            };
        }));

        res.json({
            success: true,
            data: {
                stats,
                revenueData,
                bookingsData,
                todaySchedule,
                topServices
            }
        });

    } catch (error) {
        console.error('[GET DASHBOARD STATS ERROR]', error);
        res.status(500).json({ message: 'Server error fetching dashboard stats' });
    }
};