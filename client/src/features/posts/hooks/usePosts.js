import { useState, useCallback } from 'react';
import postApi from '../api/postApi.js';

export const useCreatePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const createPost = useCallback(async (postData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.createPost(postData);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create post');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { createPost, loading, error };
};

export const usePosts = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getPosts = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.getPosts(params);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch posts');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { getPosts, loading, error };
};

export const usePostById = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getPostById = useCallback(async (postId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.getPostById(postId);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch post');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { getPostById, loading, error };
};

export const useUpdatePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const updatePost = useCallback(async (postId, formData) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.updatePost(postId, formData);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update post');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { updatePost, loading, error };
};

export const useDeletePost = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const deletePost = useCallback(async (postId) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.deletePost(postId);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete post');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { deletePost, loading, error };
};

export const usePostsByAuthor = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const getPostsByAuthor = useCallback(async (authorId, params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.getPostsByAuthor(authorId, params);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch posts');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { getPostsByAuthor, loading, error };
};

export const useSearchPosts = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const searchPosts = useCallback(async (params = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await postApi.searchPosts(params);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to search posts');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    return { searchPosts, loading, error };
};
