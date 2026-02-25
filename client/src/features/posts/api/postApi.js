import axiosClient from '../../../lib/axios.js';

const postApi = {
    // Get all posts with filtering & sorting
    getPosts: (params = {}) => {
        return axiosClient.get('/api/posts', { params });
    },

    // Get single post
    getPostById: (postId) => {
        return axiosClient.get(`/api/posts/${postId}`);
    },

    // Create post with images (FormData)
    createPost: (formData) => {
        return axiosClient.post('/api/posts', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Update post
    updatePost: (postId, formData) => {
        return axiosClient.patch(`/api/posts/${postId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },

    // Delete post
    deletePost: (postId) => {
        return axiosClient.delete(`/api/posts/${postId}`);
    },

    // Get posts by author
    getPostsByAuthor: (authorId, params = {}) => {
        return axiosClient.get(`/api/posts/author/${authorId}`, { params });
    },

    // Search posts
    searchPosts: (params = {}) => {
        return axiosClient.get('/api/posts/search', { params });
    },
};

export default postApi;
