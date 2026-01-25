import Post from '../models/Post.js';
import Service from '../models/Service.js';
import Salon from '../models/Salon.js';
import User from '../models/User.js';
import Staff from '../models/Staff.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_PUBLIC_PATH = path.resolve(process.cwd(), '../client/public');
const POSTS_TEMP_DIR = path.join(CLIENT_PUBLIC_PATH, 'assets/posts/temp');
const POSTS_FINAL_DIR = path.join(CLIENT_PUBLIC_PATH, 'assets/posts');

const assetUrlToFsPath = (assetUrl) => {
    if (!assetUrl || typeof assetUrl !== 'string') return null;
    // Stored as /assets/...
    const normalized = assetUrl.replace(/\\/g, '/');
    const rel = normalized.startsWith('/assets/') ? normalized.slice('/assets/'.length) : normalized.replace(/^\//, '');
    return path.join(CLIENT_PUBLIC_PATH, 'assets', rel.replace(/^assets\//, ''));
};

const resolveAuthor = async (post) => {
    if (post.authorType === 'Salon') {
        let salon = await Salon.findById(post.authorId).select('name images phone address').lean();
        if (!salon) {
            salon = await Salon.findOne({ ownerId: post.authorId }).select('name images phone address').lean();
        }
        return salon;
    }

    return await User.findById(post.authorId).select('fullName avatar email phone').lean();
};

// Ensure directories exist
[POSTS_TEMP_DIR, POSTS_FINAL_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// --- CREATE POST/BLOG ---
export const createPost = async (req, res) => {
    try {
        const { content, linkedServiceId } = req.body;
        let { taggedSalonIds, taggedStaffIds } = req.body;
        const { _id: userId, role } = req.user;

        // Determine authorType based on role
        let authorType;
        if (role === 'SALON_OWNER') authorType = 'Salon';
        else authorType = 'Customer';

        // Normalize taggedSalonIds: allow single id or array
        if (typeof taggedSalonIds === 'string' && taggedSalonIds.trim().length > 0) {
            taggedSalonIds = [taggedSalonIds];
        }
        if (!Array.isArray(taggedSalonIds)) {
            taggedSalonIds = [];
        }

        // Normalize taggedStaffIds: allow single id or array
        if (typeof taggedStaffIds === 'string' && taggedStaffIds.trim().length > 0) {
            taggedStaffIds = [taggedStaffIds];
        }
        if (!Array.isArray(taggedStaffIds)) {
            taggedStaffIds = [];
        }

        // Role-based rules
        if (role === 'SALON_OWNER') {
            // Salon: must have at least 1 image, must link service, cannot tag salons
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ message: 'Salon posts must include at least 1 image' });
            }
            if (!linkedServiceId) {
                return res.status(400).json({ message: 'Salon posts must include linkedServiceId' });
            }
            if (taggedSalonIds.length > 0) {
                return res.status(400).json({ message: 'Salon posts cannot tag salons' });
            }
        } else if (role === 'ADMIN') {
            // Admin: optional images, can tag multiple salons, cannot link service
            if (linkedServiceId) {
                return res.status(400).json({ message: 'Admin posts cannot include linkedServiceId' });
            }
            if (taggedStaffIds.length > 0) {
                return res.status(400).json({ message: 'Admin posts cannot tag staff' });
            }
        } else {
            // Customer: optional images, must tag exactly 1 salon (check-in), cannot link service
            if (linkedServiceId) {
                return res.status(400).json({ message: 'Customer posts cannot include linkedServiceId' });
            }
            if (taggedSalonIds.length !== 1) {
                return res.status(400).json({ message: 'Customer posts must tag exactly 1 salon' });
            }
            if (taggedStaffIds.length > 0) {
                return res.status(400).json({ message: 'Customer posts cannot tag staff' });
            }
        }

        // Validate tagged salons exist
        if (taggedSalonIds.length > 0) {
            const count = await Salon.countDocuments({ _id: { $in: taggedSalonIds } });
            if (count !== taggedSalonIds.length) {
                return res.status(404).json({ message: 'One or more tagged salons not found' });
            }
        }

        // Validate tagged staff (only salon owner can tag staff of their salon)
        if (role === 'SALON_OWNER' && taggedStaffIds.length > 0) {
            const salon = await Salon.findOne({ ownerId: userId });
            if (!salon) {
                return res.status(404).json({ message: 'Salon not found for owner' });
            }
            const count = await Staff.countDocuments({ _id: { $in: taggedStaffIds }, salonId: salon._id });
            if (count !== taggedStaffIds.length) {
                return res.status(404).json({ message: 'One or more tagged staff not found in your salon' });
            }
        }

        // Validate linkedServiceId if provided
        if (linkedServiceId) {
            const service = await Service.findById(linkedServiceId);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }
        }

        // Process images if uploaded
        let images = [];
        if (req.files && req.files.length > 0) {
            images = req.files.map(file => `/assets/posts/temp/${file.filename}`);
        }

        const newPost = new Post({
            authorId: userId,
            authorType,
            content: content || '',
            images,
            taggedSalonIds,
            taggedStaffIds,
            linkedServiceId: linkedServiceId || null,
        });

        await newPost.save();

        // Populate author info for response
        const populatedPost = await Post.findById(newPost._id)
            .populate('linkedServiceId', 'name price duration image');

        res.status(201).json(populatedPost);
    } catch (error) {
        // Clean up uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (e) {
                    // Ignore cleanup errors
                }
            });
        }
        res.status(400).json({ message: error.message });
    }
};

// --- GET ALL POSTS/BLOGS with filtering & pagination & sorting ---
export const getPosts = async (req, res) => {
    try {
        const {
            authorType,         // 'Customer' or 'Salon'
            taggedSalonId,
            sortBy = 'createdAt', // 'createdAt', 'likes'
            order = 'desc',      // 'asc' or 'desc'
            page = 1,
            limit = 10
        } = req.query;

        const skip = (page - 1) * limit;

        // Build filter
        const filter = {};
        if (authorType) filter.authorType = authorType;
        if (taggedSalonId) filter.taggedSalonIds = taggedSalonId;

        // Build sort object
        const sortObj = {};
        const sortKey = sortBy === 'likes' ? 'likes' : 'createdAt';
        sortObj[sortKey] = order === 'asc' ? 1 : -1;

        const total = await Post.countDocuments(filter);
        const posts = await Post.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('linkedServiceId', 'name price duration image')
            .populate('taggedSalonIds', 'name images')
            .populate({
                path: 'taggedStaffIds',
                select: 'fullName userId',
                populate: { path: 'userId', select: 'fullName avatar email phone' },
            })
            .lean();

        // Fetch author details (User or Salon)
        const postsWithAuthors = await Promise.all(posts.map(async (post) => {
            const author = await resolveAuthor(post);
            return { ...post, author };
        }));

        res.json({
            posts: postsWithAuthors,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- GET SINGLE POST/BLOG ---
export const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate('linkedServiceId', 'name price duration image salonId')
            .populate('taggedSalonIds', 'name images phone address')
            .populate({
                path: 'taggedStaffIds',
                select: 'fullName userId',
                populate: { path: 'userId', select: 'fullName avatar email phone' },
            });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Fetch author details
        const author = await resolveAuthor(post);

        res.json({ ...post.toObject(), author });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- UPDATE POST/BLOG ---
export const updatePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check authorization: only author can update
        if (post.authorType === 'Salon') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            const authorIdStr = post.authorId.toString();
            const ownerIdStr = req.user._id.toString();
            const salonIdStr = salon?._id?.toString();

            if (authorIdStr !== ownerIdStr && authorIdStr !== salonIdStr) {
                return res.status(403).json({ message: 'Not authorized to update this post' });
            }
        } else if (post.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this post' });
        }

        const { content, linkedServiceId, existingImagesJson } = req.body;
        let { taggedSalonIds, taggedStaffIds } = req.body;

        if (content !== undefined) post.content = content;

        // Normalize taggedSalonIds: allow single id or array
        if (typeof taggedSalonIds === 'string' && taggedSalonIds.trim().length > 0) {
            taggedSalonIds = [taggedSalonIds];
        }
        if (taggedSalonIds !== undefined && !Array.isArray(taggedSalonIds)) {
            taggedSalonIds = [];
        }

        // Normalize taggedStaffIds: allow single id or array
        if (typeof taggedStaffIds === 'string' && taggedStaffIds.trim().length > 0) {
            taggedStaffIds = [taggedStaffIds];
        }
        if (taggedStaffIds !== undefined && !Array.isArray(taggedStaffIds)) {
            taggedStaffIds = [];
        }

        // Enforce role-based rules on update
        if (req.user.role === 'SALON_OWNER') {
            if (taggedSalonIds !== undefined && taggedSalonIds.length > 0) {
                return res.status(400).json({ message: 'Salon posts cannot tag salons' });
            }
            if (linkedServiceId !== undefined && !linkedServiceId) {
                return res.status(400).json({ message: 'Salon posts must include linkedServiceId' });
            }
        } else if (req.user.role === 'ADMIN') {
            if (linkedServiceId) {
                return res.status(400).json({ message: 'Admin posts cannot include linkedServiceId' });
            }
            if (taggedStaffIds !== undefined && taggedStaffIds.length > 0) {
                return res.status(400).json({ message: 'Admin posts cannot tag staff' });
            }
        } else {
            if (linkedServiceId) {
                return res.status(400).json({ message: 'Customer posts cannot include linkedServiceId' });
            }
            if (taggedSalonIds !== undefined && taggedSalonIds.length !== 1) {
                return res.status(400).json({ message: 'Customer posts must tag exactly 1 salon' });
            }
            if (taggedStaffIds !== undefined && taggedStaffIds.length > 0) {
                return res.status(400).json({ message: 'Customer posts cannot tag staff' });
            }
        }

        if (taggedSalonIds !== undefined) {
            if (taggedSalonIds.length > 0) {
                const count = await Salon.countDocuments({ _id: { $in: taggedSalonIds } });
                if (count !== taggedSalonIds.length) {
                    return res.status(404).json({ message: 'One or more tagged salons not found' });
                }
            }
            post.taggedSalonIds = taggedSalonIds;
        }

        if (taggedStaffIds !== undefined) {
            if (req.user.role === 'SALON_OWNER' && taggedStaffIds.length > 0) {
                const salon = await Salon.findOne({ ownerId: req.user._id });
                if (!salon) {
                    return res.status(404).json({ message: 'Salon not found for owner' });
                }
                const count = await Staff.countDocuments({ _id: { $in: taggedStaffIds }, salonId: salon._id });
                if (count !== taggedStaffIds.length) {
                    return res.status(404).json({ message: 'One or more tagged staff not found in your salon' });
                }
            }
            post.taggedStaffIds = taggedStaffIds;
        }

        // Update linkedServiceId if provided
        if (linkedServiceId) {
            const service = await Service.findById(linkedServiceId);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }
            post.linkedServiceId = linkedServiceId;
        }

        // Handle existing images keep-list (for edit delete-image)
        const oldImages = Array.isArray(post.images) ? post.images : [];
        let keepImages = oldImages;
        if (existingImagesJson !== undefined) {
            try {
                const parsed = JSON.parse(existingImagesJson);
                if (!Array.isArray(parsed)) {
                    return res.status(400).json({ message: 'existingImagesJson must be an array' });
                }
                keepImages = parsed
                    .filter((x) => typeof x === 'string')
                    .map((x) => x.replace(/\\/g, '/'))
                    .filter((x) => x.startsWith('/assets/'));
            } catch (e) {
                return res.status(400).json({ message: 'Invalid existingImagesJson' });
            }
        }

        // Delete images removed by user
        const keepSet = new Set(keepImages);
        const removedImages = oldImages.filter((img) => !keepSet.has(img));
        removedImages.forEach((imgPath) => {
            try {
                const filePath = assetUrlToFsPath(imgPath);
                if (filePath && fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) {
                // Ignore cleanup errors
            }
        });

        post.images = keepImages;

        // Handle new images if uploaded
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => `/assets/posts/temp/${file.filename}`);
            post.images = [...post.images, ...newImages];
        }

        // Enforce role-specific image rule after update
        if (req.user.role === 'SALON_OWNER') {
            if (!post.images || post.images.length === 0) {
                return res.status(400).json({ message: 'Salon posts must include at least 1 image' });
            }
        }

        await post.save();

        const updatedPost = await Post.findById(post._id)
            .populate('linkedServiceId', 'name price duration image')
            .populate('taggedSalonIds', 'name images')
            .populate({
                path: 'taggedStaffIds',
                select: 'fullName userId',
                populate: { path: 'userId', select: 'fullName avatar email phone' },
            });

        res.json(updatedPost);
    } catch (error) {
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (e) {
                    // Ignore
                }
            });
        }
        res.status(400).json({ message: error.message });
    }
};

// --- DELETE POST/BLOG ---
export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check authorization: only author can delete
        if (post.authorType === 'Salon') {
            const salon = await Salon.findOne({ ownerId: req.user._id });
            const authorIdStr = post.authorId.toString();
            const ownerIdStr = req.user._id.toString();
            const salonIdStr = salon?._id?.toString();

            if (authorIdStr !== ownerIdStr && authorIdStr !== salonIdStr) {
                return res.status(403).json({ message: 'Not authorized to delete this post' });
            }
        } else if (post.authorId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        // Clean up image files
        if (post.images && post.images.length > 0) {
            post.images.forEach(imgPath => {
                try {
                    const filePath = assetUrlToFsPath(imgPath);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                } catch (e) {
                    // Ignore cleanup errors
                }
            });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- GET POSTS BY AUTHOR ---
export const getPostsByAuthor = async (req, res) => {
    try {
        const { authorId } = req.params;
        const { q, sortBy = 'createdAt', order = 'desc', page = 1, limit = 10 } = req.query;

        const skip = (page - 1) * limit;
        const filter = { authorId };
        if (q && q.trim().length > 0) {
            filter.content = { $regex: q.trim(), $options: 'i' };
        }

        const sortObj = {};
        const sortKey = sortBy === 'createdAt' ? 'createdAt' : 'createdAt';
        sortObj[sortKey] = order === 'asc' ? 1 : -1;

        const total = await Post.countDocuments(filter);
        const posts = await Post.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('linkedServiceId', 'name price duration image')
            .populate('taggedSalonIds', 'name images')
            .populate({
                path: 'taggedStaffIds',
                select: 'fullName userId',
                populate: { path: 'userId', select: 'fullName avatar email phone' },
            })
            .lean();

        res.json({
            posts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- SEARCH POSTS ---
export const searchPosts = async (req, res) => {
    try {
        const { q, page = 1, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ message: 'Search query too short' });
        }

        const skip = (page - 1) * limit;
        const filter = {
            $or: [
                { content: { $regex: q, $options: 'i' } },
            ]
        };

        const total = await Post.countDocuments(filter);
        const posts = await Post.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('linkedServiceId', 'name price duration image')
            .populate('taggedSalonIds', 'name images')
            .populate({
                path: 'taggedStaffIds',
                select: 'fullName userId',
                populate: { path: 'userId', select: 'fullName avatar email phone' },
            })
            .lean();

        res.json({
            posts,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
