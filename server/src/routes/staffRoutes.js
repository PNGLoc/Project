// server/src/routes/staffRoutes.js
import express from 'express';
import { createStaff, getStaffs } from '../controllers/staffController.js';
import { protect, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public test route (no auth) to quickly verify routing
router.get('/test', (req, res) => {
    res.json({ message: 'Staff routes đang hoạt động!' });
});

// Protect all other staff routes: only SALON_OWNER
router.use(protect, authorize('SALON_OWNER'));

// Create a staff or list staffs
router
  .route('/')
  .post(createStaff)
  .get(getStaffs);

export default router;