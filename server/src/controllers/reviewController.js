import Review from '../models/Review.js';
import Salon from '../models/Salon.js';

// @desc    Create a new review
// @route   POST /api/reviews
export const createReview = async (req, res) => {
    try {
        const { salonId, rating, comment } = req.body;
        const userId = req.user._id;

        // Ensure salon exists
        const salon = await Salon.findById(salonId);
        if (!salon) {
            return res.status(404).json({ success: false, message: "Salon not found" });
        }

        // Check if user already reviewed
        const existingReview = await Review.findOne({ salonId, userId });
        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already reviewed this salon. Please edit your existing review instead." });
        }

        // Handle images
        const images = req.files ? req.files.map(file => `/assets/reviews/${file.filename}`) : [];

        const review = new Review({
            salonId,
            userId,
            rating: Number(rating),
            comment,
            images
        });

        await review.save();

        // Update Salon Average Rating
        const allReviews = await Review.find({ salonId });
        const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
        salon.rating = totalRating / allReviews.length;
        salon.reviews = allReviews.length;
        await salon.save();

        // Populate User info to return to frontend immediately
        await review.populate('userId', 'fullName avatar');

        res.status(201).json({
            success: true,
            data: review,
            message: "Review submitted successfully!"
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "You have already reviewed this salon." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all reviews for a specific salon
// @route   GET /api/reviews/salon/:salonId
export const getSalonReviews = async (req, res) => {
    try {
        const reviews = await Review.find({ salonId: req.params.salonId })
            .populate('userId', 'fullName avatar')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: reviews.length,
            data: reviews
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
export const deleteReview = async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        // Check ownership or admin
        if (review.userId.toString() !== req.user._id.toString() && req.user.role !== 'SYSTEM_ADMIN') {
            return res.status(403).json({ success: false, message: "Not authorized to delete this review" });
        }

        const salonId = review.salonId;
        await review.deleteOne();

        // Recalculate Salon Average Rating
        const salon = await Salon.findById(salonId);
        if (salon) {
            const allReviews = await Review.find({ salonId });
            if (allReviews.length > 0) {
                const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
                salon.rating = totalRating / allReviews.length;
                salon.reviews = allReviews.length;
            } else {
                salon.rating = 0;
                salon.reviews = 0;
            }
            await salon.save();
        }

        res.json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 */
export const updateReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const reviewId = req.params.id;
        const review = await Review.findById(reviewId);

        if (!review) return res.status(404).json({ success: false, message: "Review not found" });
        if (review.userId.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });
        if (review.isEdited) return res.status(400).json({ success: false, message: "You can only edit your review once." });

        if (rating) review.rating = Number(rating);
        if (comment !== undefined) review.comment = comment;

        // Handle images replacement if new images are uploaded
        if (req.files && req.files.length > 0) {
            review.images = req.files.map(file => `/assets/reviews/${file.filename}`);
        }

        review.isEdited = true;
        await review.save();

        // Update Salon Average Rating
        const salon = await Salon.findById(review.salonId);
        if (salon) {
            const allReviews = await Review.find({ salonId: review.salonId });
            if (allReviews.length > 0) {
                const totalRating = allReviews.reduce((sum, item) => sum + item.rating, 0);
                salon.rating = totalRating / allReviews.length;
            } else {
                salon.rating = 0;
            }
            await salon.save();
        }

        await review.populate('userId', 'fullName avatar');

        res.json({ success: true, data: review, message: "Review updated successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
