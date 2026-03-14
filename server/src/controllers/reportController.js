import Report from '../models/Report.js';
import Salon from '../models/Salon.js';

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

