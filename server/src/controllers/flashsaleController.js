import Flashsale from '../models/Flashsale.js';
import { getMySalon } from './salonController.js';

// @desc    Get all flashsales for the logged in owner's salon
// @route   GET /api/flashsales/owner
export const getMyFlashsales = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) {
            return res.status(404).json({ success: false, message: "You must configure your Salon information first!" });
        }

        const flashsales = await Flashsale.find({ salonId: mySalon._id })
            .populate('services.serviceId', 'name price')
            .sort({ createdAt: -1 });

        const now = new Date();
        const updatedFlashsales = await Promise.all(flashsales.map(async (fs) => {
            let needsSave = false;
            if (fs.status === 'Upcoming' && now >= fs.startTime && now <= fs.endTime) {
                fs.status = 'Active';
                needsSave = true;
            } else if ((fs.status === 'Upcoming' || fs.status === 'Active') && now > fs.endTime) {
                fs.status = 'Expired';
                needsSave = true;
            }
            if (needsSave) {
                await fs.save();
            }
            return fs;
        }));

        res.json({
            success: true,
            count: updatedFlashsales.length,
            data: updatedFlashsales
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new flashsale
// @route   POST /api/flashsales
export const createFlashsale = async (req, res) => {
    try {
        const { name, description, startTime, endTime, services } = req.body;
        const mySalon = await getMySalon(req.user._id);

        if (!mySalon) {
            return res.status(404).json({ success: false, message: "You must configure your Salon information first!" });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const now = new Date();
        const minStart = new Date(now.getTime() - 2 * 60000); // 2 minutes buffer

        if (start < minStart) {
            return res.status(400).json({ success: false, message: "Start time must be in the future." });
        }
        if (end <= start) {
            return res.status(400).json({ success: false, message: "End time must be after start time." });
        }

        // Check for overlapping flashsales for the same service
        const serviceIds = services.map(s => s.serviceId);

        const overlaps = await Flashsale.find({
            salonId: mySalon._id,
            status: { $in: ['Upcoming', 'Active'] },
            'services.serviceId': { $in: serviceIds },
            $or: [
                { startTime: { $lt: end, $gte: start } },
                { endTime: { $gt: start, $lte: end } },
                { startTime: { $lte: start }, endTime: { $gte: end } }
            ]
        });

        if (overlaps.length > 0) {
            return res.status(400).json({
                success: false,
                message: "One or more selected services are already included in another campaign during this time period."
            });
        }

        const flashsale = new Flashsale({
            salonId: mySalon._id,
            name,
            description,
            startTime: start,
            endTime: end,
            status: 'Upcoming',
            services
        });

        const createdFlashsale = await flashsale.save();
        res.status(201).json({
            success: true,
            data: createdFlashsale
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a flashsale
// @route   PUT /api/flashsales/:id
export const updateFlashsale = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ success: false, message: "Salon not found." });

        const flashsale = await Flashsale.findOne({ _id: req.params.id, salonId: mySalon._id });
        if (!flashsale) return res.status(404).json({ success: false, message: "Campaign not found." });

        if (flashsale.status === 'Expired') {
            return res.status(400).json({ success: false, message: "Cannot update an expired campaign." });
        }

        const { name, description, startTime, endTime, services } = req.body;

        if (startTime && endTime) {
            const start = new Date(startTime);
            const end = new Date(endTime);
            if (end <= start) {
                return res.status(400).json({ success: false, message: "End time must be after start time." });
            }

            const serviceIdsToCheck = services ? services.map(s => s.serviceId) : flashsale.services.map(s => s.serviceId);
            const overlaps = await Flashsale.find({
                _id: { $ne: flashsale._id },
                salonId: mySalon._id,
                status: { $in: ['Upcoming', 'Active'] },
                'services.serviceId': { $in: serviceIdsToCheck },
                $or: [
                    { startTime: { $lt: end, $gte: start } },
                    { endTime: { $gt: start, $lte: end } },
                    { startTime: { $lte: start }, endTime: { $gte: end } }
                ]
            });

            if (overlaps.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: "Update failed. Time overlaps with another campaign for the selected services."
                });
            }
        }

        const updatedFlashsale = await Flashsale.findOneAndUpdate(
            { _id: req.params.id, salonId: mySalon._id },
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            data: updatedFlashsale
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete/Cancel a flashsale
// @route   DELETE /api/flashsales/:id
export const deleteFlashsale = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ success: false, message: "Salon not found." });

        const flashsale = await Flashsale.findOneAndDelete({ _id: req.params.id, salonId: mySalon._id });

        if (!flashsale) {
            return res.status(404).json({ success: false, message: "Campaign not found." });
        }

        res.json({ success: true, message: "Campaign deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get public active flashsales for a salon
// @route   GET /api/flashsales/salon/:salonId
export const getActiveFlashsalesBySalon = async (req, res) => {
    try {
        const now = new Date();
        const flashsales = await Flashsale.find({
            salonId: req.params.salonId,
            status: { $in: ['Upcoming', 'Active'] },
            startTime: { $lte: now },
            endTime: { $gt: now }
        }).populate('services.serviceId', 'name price');

        res.json({
            success: true,
            count: flashsales.length,
            data: flashsales
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get top 3 public flashsales across all salons
// @route   GET /api/flashsales/public/top
export const getTopPublicFlashsales = async (req, res) => {
    try {
        const now = new Date();
        const flashsales = await Flashsale.find({
            status: { $in: ['Upcoming', 'Active'] },
            startTime: { $lte: now },
            endTime: { $gt: now }
        })
            .populate('salonId', 'name address')
            .populate('services.serviceId', 'name price');

        const allServices = [];

        flashsales.forEach(fs => {
            if (!fs.salonId) return;
            fs.services.forEach(servObj => {
                if (!servObj.serviceId) return;

                const originalPrice = servObj.serviceId.price;
                if (!originalPrice) return;

                let percentOff = 0;
                let discountedPrice = originalPrice;

                if (servObj.discountType === 'percentage') {
                    percentOff = servObj.discountValue;
                    discountedPrice = originalPrice - (originalPrice * percentOff / 100);
                } else {
                    const discountAmt = servObj.discountValue;
                    percentOff = (discountAmt / originalPrice) * 100;
                    discountedPrice = originalPrice - discountAmt;
                }

                allServices.push({
                    id: `${fs._id}_${servObj.serviceId._id}`,
                    flashsaleId: fs._id,
                    flashsaleName: fs.name,
                    endTime: fs.endTime,
                    service: servObj.serviceId,
                    salon: fs.salonId,
                    discountType: servObj.discountType,
                    discountValue: servObj.discountValue,
                    discountedPrice: discountedPrice,
                    percentOff: Math.round(percentOff)
                });
            });
        });

        allServices.sort((a, b) => b.percentOff - a.percentOff);
        const top3 = allServices.slice(0, 3);

        res.json({
            success: true,
            data: top3
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
