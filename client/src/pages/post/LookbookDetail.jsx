import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLookbookById } from '../../features/posts/hooks/usePosts.js';
import postApi from '../../features/posts/api/postApi.js';
import '../../assets/css/LookbookDetail.css'; // We'll create this CSS

const LookbookDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getLookbookById, loading, error } = useLookbookById();
    const [post, setPost] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [likes, setLikes] = useState(0);
    const [liked, setLiked] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        const loadPost = async () => {
            try {
                const data = await getLookbookById(id);
                setPost(data);
                setLikes(data.likes || 0);
                setComments(Array.isArray(data.comments) ? data.comments : []);
                if (Array.isArray(data.likedBy) && currentUser._id) {
                    setLiked(data.likedBy.includes(currentUser._id));
                } else {
                    setLiked(false);
                }
            } catch (err) {
                console.error('Failed to load lookbook:', err);
            }
        };
        loadPost();
    }, [id, getLookbookById]);

    if (loading) return <div className="lookbook-loading">Loading masterpiece...</div>;
    if (error || !post) return <div className="lookbook-error">Lookbook not found</div>;

    const images = post.images && post.images.length > 0 ? post.images : [];
    const mainImage = images[activeImageIndex]
        ? `http://localhost:5000${images[activeImageIndex]}`
        : 'https://via.placeholder.com/1200x800?text=No+Image';

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatDateTime = (dateStr) => {
        return new Date(dateStr).toLocaleString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const handleToggleLike = async () => {
        if (!currentUser._id) {
            alert('Please login to like this lookbook.');
            return;
        }
        try {
            const res = await postApi.toggleLike(post._id);
            const updated = res.data;
            setLikes(updated.likes || 0);
            if (Array.isArray(updated.likedBy) && currentUser._id) {
                setLiked(updated.likedBy.includes(currentUser._id));
            } else {
                setLiked(false);
            }
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!currentUser._id) {
            alert('Please login to comment.');
            return;
        }
        if (!newComment.trim()) return;
        try {
            const res = await postApi.addComment(post._id, { content: newComment.trim() });
            const updatedComments = Array.isArray(res.data.comments) ? res.data.comments : [];
            setComments(updatedComments);
            setNewComment('');
        } catch (err) {
            console.error('Failed to add comment:', err);
        }
    };

    return (
        <div className="lookbook-container">
            <button className="lookbook-back-btn" onClick={() => navigate(-1)}>
                &larr; Back
            </button>

            <div className="lookbook-content-wrapper">
                {/* Visual Section */}
                <div className="lookbook-visual">
                    <div className="lookbook-main-image-frame">
                        <img src={mainImage} alt="Lookbook Main" className="lookbook-main-image" />
                    </div>
                    {images.length > 1 && (
                        <div className="lookbook-thumbnails">
                            {images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={`http://localhost:5000${img}`}
                                    alt={`Thumb ${idx}`}
                                    className={`lookbook-thumb ${idx === activeImageIndex ? 'active' : ''}`}
                                    onClick={() => setActiveImageIndex(idx)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Section */}
                <div className="lookbook-details">
                    <div className="lookbook-header">
                        <div className="lookbook-meta-top">
                            <span className="lookbook-date">{formatDate(post.createdAt)}</span>
                            <span className="lookbook-author-type">{post.authorType}</span>
                        </div>
                        <h1 className="lookbook-title">{post.title || (post.content ? post.content.substring(0, 50) + "..." : "Untitled Lookbook")}</h1>

                        <div className="lookbook-author-profile">
                            <img
                                src={post.author?.avatar ? `http://localhost:5000${post.author.avatar}` : 'https://via.placeholder.com/50'}
                                alt="Author"
                                className="lookbook-author-avatar"
                            />
                            <div className="lookbook-author-info">
                                <span className="lookbook-by">Curated by</span>
                                <span className="lookbook-author-name">{post.author?.fullName || post.author?.name || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="lookbook-body">
                        <p>{post.content}</p>
                    </div>

                    {/* Linked Services / Shop the Look */}
                    {(post.linkedServiceIds?.length > 0 || post.linkedServiceId) && (
                        <div className="lookbook-shop-section">
                            <h3>Shop the Look</h3>
                            <div className="lookbook-products">
                                {(post.linkedServiceIds || [post.linkedServiceId]).filter(x => x).map((service, idx) => (
                                    <div key={idx} className="lookbook-product-card" onClick={() => navigate(`/service/${service._id}`)}>
                                        <div className="lookbook-product-image">
                                            {/* Placeholder for service image if available, else generic icon */}
                                            <span>🛍️</span>
                                        </div>
                                        <div className="lookbook-product-info">
                                            <h4>{service.name}</h4>
                                            <span className="lookbook-price">${service.price}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tagged Staff/Salons */}
                    <div className="lookbook-tags">
                        {post.taggedSalonIds?.length > 0 && (
                            <div className="lookbook-tag-group">
                                <span>Salons:</span>
                                {post.taggedSalonIds.map(s => (
                                    <span key={s._id} className="lookbook-tag">{s.name}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="lookbook-interactions">
                <div className="lookbook-like-row">
                    <button
                        className={`lookbook-like-button ${liked ? 'liked' : ''}`}
                        onClick={handleToggleLike}
                    >
                        <span>{liked ? '♥' : '♡'}</span>
                    </button>
                    <span className="lookbook-like-count">
                        {likes}
                    </span>
                </div>

                <div className="lookbook-comments-section">
                    <h3 className="lookbook-comments-title">Comments</h3>
                    {comments.length === 0 ? (
                        <p className="lookbook-no-comments">No comments yet. Be the first to comment!</p>
                    ) : (
                        <ul className="lookbook-comments-list">
                            {comments.map((c) => (
                                <li key={c._id || c.createdAt} className="lookbook-comment-item">
                                    <div className="lookbook-comment-avatar">
                                        <img
                                            src={
                                                c.user?.avatar
                                                    ? `http://localhost:5000${c.user.avatar}`
                                                    : 'https://via.placeholder.com/32'
                                            }
                                            alt="avatar"
                                        />
                                    </div>
                                    <div className="lookbook-comment-body">
                                        <div className="lookbook-comment-header">
                                            <span className="lookbook-comment-author">
                                                {c.user?.fullName || 'User'}
                                            </span>
                                            <span className="lookbook-comment-date">
                                                {c.createdAt ? formatDateTime(c.createdAt) : ''}
                                            </span>
                                        </div>
                                        <p className="lookbook-comment-text">{c.content}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    <form className="lookbook-comment-form" onSubmit={handleAddComment}>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                        />
                        <button type="submit">Post Comment</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LookbookDetail;
