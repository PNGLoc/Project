import Salon from '../models/Salon.js';
import User from '../models/User.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_PUBLIC_PATH = path.resolve(__dirname, '../../client/public');
const TEMP_DIR = path.join(CLIENT_PUBLIC_PATH, 'assets/salon/temp');
const FINAL_DIR = path.join(CLIENT_PUBLIC_PATH, 'assets/salon/salons');

// --- 1. Đăng ký ---
export const registerSalon = async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        let parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;

        const newSalon = new Salon({
            name, phone, address: parsedAddress,
            images: req.file ? [`/assets/salon/temp/${req.file.filename}`] : [],
            ownerId: req.user._id,
            isApproved: false
        });
        await newSalon.save();
        res.status(201).json(newSalon);
    } catch (error) {
        if (error.code === 11000 && req.file) fs.unlinkSync(req.file.path);
        res.status(400).json({ message: error.message });
    }
};

// --- 2. Duyệt (ĐÂY LÀ HÀM ĐANG BÁO LỖI) ---
export const approveSalon = async (req, res) => {
    try {
        const oldSalon = await Salon.findById(req.params.id);
        if (!oldSalon) return res.status(404).json({ message: "Không tìm thấy" });

        let finalImages = oldSalon.images.map(imagePath => {
            if (imagePath.includes('/temp/')) {
                const fileName = path.basename(imagePath);
                const oldPath = path.join(TEMP_DIR, fileName);
                const newPath = path.join(FINAL_DIR, fileName);
                if (fs.existsSync(oldPath)) {
                    fs.renameSync(oldPath, newPath);
                    return `/assets/salon/salons/${fileName}`;
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

// --- 4. Get All ---
export const getAllSalons = async (req, res) => {
    try {
        const salons = await Salon.find({ isApproved: true });
        res.json(salons);
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// --- 5. Get Pending ---
export const getPendingSalons = async (req, res) => {
    try {
        const salons = await Salon.find({ isApproved: false }).populate('ownerId', 'fullName email');
        res.json(salons);
    } catch (error) { res.status(500).json({ message: error.message }); }
};