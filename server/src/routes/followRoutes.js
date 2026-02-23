import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
  createFollow,
  removeFollow,
  getFollowStatus,
  getMySalons,
  getMyStaffs,
} from '../controllers/followController.js';

const router = express.Router();

// All follow routes are for CUSTOMER role
router.use(protect, authorize('CUSTOMER'));

router.post('/', createFollow);
router.delete('/', removeFollow);
router.get('/status', getFollowStatus);
router.get('/my-salons', getMySalons);
router.get('/my-staffs', getMyStaffs);

export default router;


