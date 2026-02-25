import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  createFollow,
  removeFollow,
  getFollowStatus,
  getMySalons,
  getMyStaffs,
  getFollowers
} from '../controllers/followController.js';

const router = express.Router();

// Routes for PROVIDERS (Salon Owners, Staff)
router.get('/followers', protect, authorize('SALON_OWNER', 'STAFF'), getFollowers);

// Routes for CUSTOMERS
router.use(protect, authorize('CUSTOMER'));

router.post('/', createFollow);
router.delete('/', removeFollow);
router.get('/status', getFollowStatus);
router.get('/my-salons', getMySalons);
router.get('/my-staffs', getMyStaffs);

export default router;


