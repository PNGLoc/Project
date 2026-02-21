import express from 'express';
import { protect, authorize } from '../middlewares/authMiddleware.js';
import {
    getMyCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    getPublicCategoriesBySalon
} from '../controllers/categoryController.js';

const router = express.Router();

// Public routes
router.get('/salon/:salonId', getPublicCategoriesBySalon);

// Private routes for Salon Owner
router.use(protect);
router.use(authorize('SALON_OWNER'));

router.get('/', getMyCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
