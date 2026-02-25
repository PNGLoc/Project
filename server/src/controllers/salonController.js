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