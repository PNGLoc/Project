import Follow from '../models/Follow.js';
import Salon from '../models/Salon.js';
import Staff from '../models/Staff.js';
import User from '../models/User.js'; // Assuming User model is needed for population

const ensureCustomerRole = (user) => {
  if (!user || user.role !== 'CUSTOMER') {
    const err = new Error('Only customers can follow salons or stylists');
    err.statusCode = 403;
    throw err;
  }
};

// POST /api/follows
export const createFollow = async (req, res) => {
  try {
    ensureCustomerRole(req.user);
    const { targetType, targetId } = req.body;

    if (!targetType || !targetId) {
      return res
        .status(400)
        .json({ message: 'targetType and targetId are required' });
    }

    if (!['SALON', 'STAFF'].includes(targetType)) {
      return res.status(400).json({ message: 'Invalid targetType' });
    }

    // Check if already following first
    const existingFollow = await Follow.findOne({
      followerId: req.user._id,
      targetType,
      targetId,
    });

    if (existingFollow) {
      // Already following, return success
      return res.status(200).json({
        isFollowing: true,
        followId: existingFollow._id,
        message: 'Already following',
      });
    }

    // Verify target exists
    if (targetType === 'SALON') {
      const salon = await Salon.findById(targetId);
      if (!salon) {
        return res.status(404).json({ message: 'Salon not found' });
      }
    } else if (targetType === 'STAFF') {
      const staff = await Staff.findById(targetId);
      if (!staff) {
        return res.status(404).json({ message: 'Staff not found' });
      }
    }

    // Create new follow - use findOneAndUpdate with upsert to avoid duplicate key issues
    try {
      const follow = await Follow.findOneAndUpdate(
        {
          followerId: req.user._id,
          targetType,
          targetId,
        },
        {
          followerId: req.user._id,
          targetType,
          targetId,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      res.status(201).json({
        isFollowing: true,
        followId: follow._id,
      });
    } catch (createError) {
      // Handle duplicate key error gracefully (in case old index still exists)
      if (createError.code === 11000 || createError.codeName === 'DuplicateKey') {
        console.warn('[FOLLOW CREATE] Duplicate key error, trying to find existing follow');
        // Try to find existing follow
        const existing = await Follow.findOne({
          followerId: req.user._id,
          targetType,
          targetId,
        });
        if (existing) {
          return res.status(200).json({
            isFollowing: true,
            followId: existing._id,
            message: 'Already following',
          });
        }
        // If not found, it might be due to old index conflict
        return res.status(409).json({
          message: 'Unable to create follow due to database index conflict. Please contact admin.',
        });
      }
      // Re-throw if it's not a duplicate key error
      throw createError;
    }
  } catch (error) {
    console.error('[FOLLOW CREATE ERROR]', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Server error' });
  }
};

// DELETE /api/follows
export const removeFollow = async (req, res) => {
  try {
    ensureCustomerRole(req.user);
    const { targetType, targetId } = req.body;

    if (!targetType || !targetId) {
      return res
        .status(400)
        .json({ message: 'targetType and targetId are required' });
    }

    const result = await Follow.findOneAndDelete({
      followerId: req.user._id,
      targetType,
      targetId,
    });

    res.json({
      isFollowing: false,
      removed: !!result,
    });
  } catch (error) {
    console.error('[FOLLOW REMOVE ERROR]', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Server error' });
  }
};

// GET /api/follows/status?targetType=&targetId=
export const getFollowStatus = async (req, res) => {
  try {
    ensureCustomerRole(req.user);
    const { targetType, targetId } = req.query;

    if (!targetType || !targetId) {
      return res
        .status(400)
        .json({ message: 'targetType and targetId are required' });
    }

    const exists = await Follow.exists({
      followerId: req.user._id,
      targetType,
      targetId,
    });

    res.json({ isFollowing: !!exists });
  } catch (error) {
    console.error('[FOLLOW STATUS ERROR]', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Server error' });
  }
};

// GET /api/follows/my-salons
export const getMySalons = async (req, res) => {
  try {
    ensureCustomerRole(req.user);
    const follows = await Follow.find({
      followerId: req.user._id,
      targetType: 'SALON',
    }).select('targetId');

    const salonIds = follows.map((f) => f.targetId);

    const salons = await Salon.find({ _id: { $in: salonIds } }).lean();

    res.json({ items: salons });
  } catch (error) {
    console.error('[FOLLOW MY SALONS ERROR]', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Server error' });
  }
};

// GET /api/follows/my-staffs
export const getMyStaffs = async (req, res) => {
  try {
    ensureCustomerRole(req.user);
    const follows = await Follow.find({
      followerId: req.user._id,
      targetType: 'STAFF',
    }).select('targetId');

    const staffIds = follows.map((f) => f.targetId);

    const staffs = await Staff.find({ _id: { $in: staffIds } })
      .populate('userId', 'fullName email avatar phone')
      .lean();

    res.json({ items: staffs });
  } catch (error) {
    console.error('[FOLLOW MY STAFFS ERROR]', error);
    res
      .status(error.statusCode || 500)
      .json({ message: error.message || 'Server error' });
  }
};

export const getFollowers = async (req, res) => {
  try {
    console.log('[GET FOLLOWERS] User:', { id: req.user._id, role: req.user.role });
    let targetType;
    let targetId;

    if (req.user.role === 'SALON_OWNER') {
      targetType = 'SALON';
      // Find the salon owned by this user
      const salon = await Salon.findOne({ ownerId: req.user._id });
      console.log('[GET FOLLOWERS] Found Salon:', salon?._id);
      if (!salon) {
        return res.status(404).json({ message: 'Salon not found for this owner' });
      }
      targetId = salon._id;
    } else if (req.user.role === 'STAFF') {
      targetType = 'STAFF';
      // Find the staff record for this user
      const staff = await Staff.findOne({ userId: req.user._id });
      console.log('[GET FOLLOWERS] Found Staff:', staff?._id);
      if (!staff) {
        return res.status(404).json({ message: 'Staff record not found for this user' });
      }
      targetId = staff._id;
    } else {
      console.log('[GET FOLLOWERS] Forbidden Role:', req.user.role);
      return res.status(403).json({ message: 'Only Salon Owners and Staff can view their followers' });
    }

    const follows = await Follow.find({
      targetType,
      targetId,
    })
      .populate('followerId', 'fullName email avatar phone')
      .sort({ createdAt: -1 });

    console.log('[GET FOLLOWERS] Found Follows Count:', follows.length);

    const followers = follows.map(f => ({
      ...f.followerId.toObject(),
      followedAt: f.createdAt
    }));

    res.json({
      count: followers.length,
      items: followers
    });
  } catch (error) {
    console.error('[GET FOLLOWERS ERROR]', error);
    res.status(500).json({ message: 'Server error while fetching followers' });
  }
};
