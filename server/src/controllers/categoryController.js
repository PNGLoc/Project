import Category from '../models/Category.js';
import Service from '../models/Service.js';
import { getMySalon } from './salonController.js';

// @desc    Get all categories for a salon owner
// @route   GET /api/categories
// @access  Private/SALON_OWNER
export const getMyCategories = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        const categories = await Category.find({ salonId: mySalon._id });
        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/SALON_OWNER
export const createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const mySalon = await getMySalon(req.user._id);

        if (!mySalon) {
            return res.status(404).json({ message: "Salon not found." });
        }

        const category = new Category({
            name,
            description,
            salonId: mySalon._id
        });

        const createdCategory = await category.save();
        res.status(201).json({
            success: true,
            data: createdCategory
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Category name already exists for this salon." });
        }
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private/SALON_OWNER
export const updateCategory = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ message: "Salon not found." });

        const category = await Category.findOneAndUpdate(
            { _id: req.params.id, salonId: mySalon._id },
            req.body,
            { new: true, runValidators: true }
        );

        if (!category) return res.status(404).json({ success: false, message: "Category not found or unauthorized." });

        res.json({
            success: true,
            data: category
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private/SALON_OWNER
export const deleteCategory = async (req, res) => {
    try {
        const mySalon = await getMySalon(req.user._id);
        if (!mySalon) return res.status(404).json({ message: "Salon not found." });

        const category = await Category.findOneAndDelete({ _id: req.params.id, salonId: mySalon._id });

        if (!category) return res.status(404).json({ success: false, message: "Category not found or unauthorized." });

        // Update services that used this category to have categoryId: null
        await Service.updateMany({ categoryId: req.params.id }, { categoryId: null });

        res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get public categories for a salon
// @route   GET /api/categories/salon/:salonId
// @access  Public
export const getPublicCategoriesBySalon = async (req, res) => {
    try {
        const categories = await Category.find({ salonId: req.params.salonId }).sort({ name: 1 });
        res.json({
            success: true,
            count: categories.length,
            data: categories
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
