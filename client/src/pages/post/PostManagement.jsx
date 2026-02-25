import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePostsByAuthor, useDeletePost } from '../../features/posts/hooks/usePosts.js';
import HeaderHome from '../../components/layout/HeaderHome.jsx';
import { FiSearch, FiX } from 'react-icons/fi';
import '../../assets/css/PostManagement.css';

const PostManagement = () => {
    const navigate = useNavigate();
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const { getPostsByAuthor, loading, error } = usePostsByAuthor();
    const { deletePost } = useDeletePost();

    const [posts, setPosts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [order, setOrder] = useState('desc');
    const [searchQ, setSearchQ] = useState('');
    const [activeQuery, setActiveQuery] = useState('');

    const loadMyPosts = async () => {
        if (!currentUser._id) {
            console.error('User ID not found');
            return;
        }
        console.log('🔍 Loading posts for user:', currentUser._id);
        try {
            const data = await getPostsByAuthor(currentUser._id, {
                q: activeQuery || undefined,
                page,
                limit: 10,
                order,
            });
            console.log('📚 Posts loaded:', data);
            setPosts(data.posts);
            setTotalPages(data.pagination.pages);
        } catch (err) {
            console.error('❌ Failed to load my posts:', err);
        }
    };

    useEffect(() => {
        loadMyPosts();
    }, [page, order, activeQuery, getPostsByAuthor]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        setActiveQuery(searchQ.trim());
    };

    const handleClearSearch = () => {
        setSearchQ('');
        setPage(1);
        setActiveQuery('');
    };

    const handleDelete = async (postId) => {
        if (window.confirm('Are you sure you want to delete this post?')) {
            try {
                await deletePost(postId);
                loadMyPosts();
            } catch (err) {
                console.error('Failed to delete post:', err);
            }
        }
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <>
            {/* Header and home-container moved to MainLayout */}

            <div className="blog-management-container">
                <div className="blog-management-header">
                    <div className="blog-management-title">
                        <h1>My Posts/News</h1>
                        <p>Manage your posts, edits, and tags.</p>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button
                            className="btn-create-blog"
                            onClick={() => navigate('/post/create')}
                        >
                            + Create
                        </button>
                        <button
                            className="btn-create-blog"
                            onClick={() => navigate('/')}
                            style={{ background: '#fff', color: '#1f2937', border: '1px solid #e5e7eb' }}
                        >
                            ← Back to Home
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="myblogs-toolbar">
                    <div className="myblogs-search">
                        <FiSearch className="myblogs-search-icon" />
                        <input
                            type="text"
                            placeholder="Search your posts..."
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                        />

                        <button type="submit" className="myblogs-btn myblogs-btn-primary">
                            Search
                        </button>

                        {activeQuery && (
                            <button
                                type="button"
                                className="myblogs-btn myblogs-btn-ghost"
                                onClick={handleClearSearch}
                                title="Clear search"
                            >
                                <FiX />
                            </button>
                        )}
                    </div>

                    <div className="myblogs-filters">
                        <div className="myblogs-filter">
                            <label>Order</label>
                            <select
                                value={order}
                                onChange={(e) => {
                                    setOrder(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="desc">Newest</option>
                                <option value="asc">Oldest</option>
                            </select>
                        </div>
                    </div>
                </form>

                {error && <div className="blog-error-message">❌ {error}</div>}

                {loading && <div className="blog-loading-message">Loading your posts...</div>}

                {!loading && posts.length === 0 && (
                    <div className="blog-empty-message">
                        <p>📭 No posts yet</p>
                    </div>
                )}

                {posts.map((post) => (
                    <div key={post._id} className="blog-management-card">
                        <div className="blog-management-content">
                            <h3>{post.content.substring(0, 80)}</h3>
                            <p className="blog-date">📅 {formatDate(post.createdAt)}</p>
                            <p className="blog-preview">{post.content.substring(0, 150)}...</p>
                        </div>

                        <div className="blog-management-actions">
                            <button
                                className="btn-view"
                                onClick={() => navigate(`/post/${post._id}`)}
                            >
                                📰 View
                            </button>
                            <button
                                className="btn-edit"
                                onClick={() => navigate(`/post/${post._id}/edit`)}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                className="btn-delete"
                                onClick={() => handleDelete(post._id)}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                ))}

                {totalPages > 1 && (
                    <div className="blog-management-pagination">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            ← Prev
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                className={p === page ? 'active' : ''}
                                onClick={() => setPage(p)}
                            >
                                {p}
                            </button>
                        ))}
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(page + 1)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default PostManagement;
