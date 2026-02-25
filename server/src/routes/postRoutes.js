import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middlewares/authMiddleware.js';
import {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    getPostsByAuthor,
    searchPosts,
    getLookbookById,
    toggleLikePost,
    addCommentToPost,
} from '../controllers/postController.js';

const router = express.Router();

// Multer config for post images
const POSTS_TEMP_DIR = path.resolve(process.cwd(), '../client/public/assets/posts/temp');
if (!fs.existsSync(POSTS_TEMP_DIR)) {
    fs.mkdirSync(POSTS_TEMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, POSTS_TEMP_DIR);
    },
    filename: function (req, file, cb) {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname || '') || '';
        cb(null, `${unique}${ext}`);
    },
});

const upload = multer({ storage });

// --- PUBLIC ROUTES ---
router.get('/', getPosts); // Get all posts/blogs with filtering & sorting
router.get('/search', searchPosts); // Search posts
router.get('/author/:authorId', getPostsByAuthor); // Get posts by author
router.get('/lookbook/:id', getLookbookById); // Get separate lookbook detail
router.get('/:id', getPostById); // Get single post

// --- PROTECTED ROUTES ---
router.post('/', protect, upload.array('images', 5), createPost); // Create post (max 5 images)
router.post('/:id/like', protect, toggleLikePost); // Toggle like on post
router.post('/:id/comments', protect, addCommentToPost); // Add comment to post
router.patch('/:id', protect, upload.array('images', 5), updatePost); // Update post
router.delete('/:id', protect, deletePost); // Delete post

export default router;
