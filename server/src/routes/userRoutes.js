import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import { getUsers, getUserById, toggleUserActive } from '../controllers/userController.js';

const router = express.Router();

// All user management routes are restricted to ADMIN role
router.use(protect, authorize('ADMIN'));

// GET /api/users?page=&limit=&q=&role=&isActive=
router.get('/', getUsers);

// GET /api/users/:id
router.get('/:id', getUserById);

// DELETE /api/users/:id  (soft delete / ban toggle)
router.delete('/:id', toggleUserActive);

export default router;


