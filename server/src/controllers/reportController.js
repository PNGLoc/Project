import Report from '../models/Report.js';
import Salon from '../models/Salon.js';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';

// @desc    Create salon complaint report (user)
// @route   POST /api/reports/salon
// @access  Private/CUSTOMER
export const createSalonReport = async (req, res) => {
  try {
    const { salonId, description, evidenceUrls = [] } = req.body;

    if (!salonId || !description || !description.trim()) {
      return res.status(400).json({ message: 'Salon and description are required.' });
    }

    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ message: 'Salon not found.' });
    }

    const report = await Report.create({
      salonId,
      userId: req.user._id,
      createdBy: req.user._id,
      type: 'SALON_COMPLAINT',
      description: description.trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 10) : [],
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('[CREATE REPORT ERROR]', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Get reports list (admin)
// @route   GET /api/reports
// @access  Private/ADMIN
export const getReports = async (req, res) => {
  try {
    const { status, salonId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (salonId) {
      query.salonId = salonId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const [items, total] = await Promise.all([
      Report.find(query)
        .populate('salonId', 'name')
        .populate('userId', 'fullName email')
        .populate('createdBy', 'fullName email role')
        .populate('targetUserId', 'fullName email')
        .populate('appointmentId', 'startAt serviceSnapshot.name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Report.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('[GET REPORTS ERROR]', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Update report status/admin note (admin)
// @route   PATCH /api/reports/:id
// @access  Private/ADMIN
export const updateReport = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    if (status) {
      report.status = status;
    }
    if (adminNote !== undefined) {
      report.adminNote = adminNote;
    }

    await report.save();

    res.json({ success: true, data: report });
  } catch (error) {
    console.error('[UPDATE REPORT ERROR]', error);
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const getOwnerSalonId = async (ownerId) => {
  const salon = await Salon.findOne({ ownerId }).select('_id');
  return salon?._id || null;
};

// @desc    Provider (SALON_OWNER) creates a report against a user based on a booking
// @route   POST /api/reports/provider
// @access  Private/SALON_OWNER
export const createProviderUserReport = async (req, res) => {
  try {
    const { appointmentId, reason = '', description, evidenceUrls = [] } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required.' });
    }
    if (!description || !String(description).trim()) {
      return res.status(400).json({ message: 'Description is required.' });
    }

    const salonId = await getOwnerSalonId(req.user._id);
    if (!salonId) {
      return res.status(404).json({ message: 'Salon not found for current owner.' });
    }

    const appointment = await Appointment.findById(appointmentId).select('salonId customerId startAt serviceSnapshot');
    if (!appointment) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (appointment.salonId.toString() !== salonId.toString()) {
      return res.status(403).json({ message: 'Not authorized to report for this booking.' });
    }

    if (!appointment.customerId) {
      return res.status(400).json({ message: 'This booking has no customer account to report.' });
    }

    const targetUser = await User.findById(appointment.customerId).select('_id role isActive');
    if (!targetUser || targetUser.role !== 'CUSTOMER') {
      return res.status(400).json({ message: 'Target user is invalid.' });
    }
    if (!targetUser.isActive) {
      return res.status(400).json({ message: 'Cannot report a walk-in/guest customer.' });
    }

    const existing = await Report.findOne({
      appointmentId: appointment._id,
      type: 'USER_COMPLAINT'
    }).select('_id');

    if (existing) {
      return res.status(409).json({ message: 'A report already exists for this booking.' });
    }

    const report = await Report.create({
      salonId,
      userId: req.user._id, // legacy required field
      createdBy: req.user._id,
      targetUserId: targetUser._id,
      appointmentId: appointment._id,
      reason: String(reason || '').trim(),
      type: 'USER_COMPLAINT',
      description: String(description).trim(),
      evidenceUrls: Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 10) : []
    });

    return res.status(201).json({ success: true, data: report });
  } catch (error) {
    console.error('[CREATE PROVIDER USER REPORT ERROR]', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Provider (SALON_OWNER) lists their submitted reports
// @route   GET /api/reports/provider/mine
// @access  Private/SALON_OWNER
export const getMyProviderReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

    const query = {
      createdBy: req.user._id,
      type: 'USER_COMPLAINT'
    };

    if (status) {
      query.status = status;
    }

    const [items, total] = await Promise.all([
      Report.find(query)
        .populate('targetUserId', 'fullName email phone')
        .populate('appointmentId', 'startAt serviceSnapshot.name')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Report.countDocuments(query)
    ]);

    return res.json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize))
      }
    });
  } catch (error) {
    console.error('[GET MY PROVIDER REPORTS ERROR]', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Provider (SALON_OWNER) views a single report detail
// @route   GET /api/reports/provider/:id
// @access  Private/SALON_OWNER
export const getMyProviderReportDetail = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
      type: 'USER_COMPLAINT'
    })
      .populate('targetUserId', 'fullName email phone')
      .populate('appointmentId', 'startAt endAt serviceSnapshot.name staffSnapshot.fullName totalPrice status');

    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('[GET MY PROVIDER REPORT DETAIL ERROR]', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

// @desc    Provider (SALON_OWNER) gets appointmentIds that have been reported
// @route   GET /api/reports/provider/reported-appointments
// @access  Private/SALON_OWNER
export const getMyReportedAppointmentIds = async (req, res) => {
  try {
    const items = await Report.find({
      createdBy: req.user._id,
      type: 'USER_COMPLAINT',
      appointmentId: { $ne: null }
    })
      .select('appointmentId')
      .sort({ createdAt: -1 })
      .limit(1000);

    const ids = items
      .map((r) => (r.appointmentId ? r.appointmentId.toString() : null))
      .filter(Boolean);

    return res.json({ success: true, data: ids });
  } catch (error) {
    console.error('[GET REPORTED APPOINTMENTS ERROR]', error);
    return res.status(500).json({ message: error.message || 'Server error' });
  }
};

