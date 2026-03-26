//LocPNG
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostById } from '../../features/posts/hooks/usePosts.js';
import '../../assets/css/PostDetail.css';

const PostDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPostById, loading, error } = usePostById();

    const [post, setPost] = useState(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const loadPost = async () => {
        try {
            const data = await getPostById(id);
            setPost(data);
        } catch (err) {
            console.error('Failed to load post:', err);
        }
    };

    useEffect(() => {
        loadPost();
    }, [id, getPostById]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                Loading post...
            </div>
        );
    }

    if (error || !post) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#d32f2f' }}>
                <h2>Post not found</h2>
                <button onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    ← Back to Home
                </button>
            </div>
        );
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const canEdit = currentUser._id === post.authorId;
    const linkedServices = Array.isArray(post.linkedServiceIds) && post.linkedServiceIds.length > 0
        ? post.linkedServiceIds
        : (post.linkedServiceId ? [post.linkedServiceId] : []);

    return (
        <>
            <div className="blog-detail-container">
                <div
                    style={{
                        marginBottom: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <button
                        onClick={() => navigate(-1)}
                        style={{
                            padding: '8px 14px',
                            borderRadius: 6,
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            cursor: 'pointer',
                            fontWeight: 600,
                        }}
                    >
                        ← Back
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => navigate(`/post/${post._id}/edit`)}
                            style={{
                                padding: '8px 14px',
                                background: '#0d9488',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '600',
                            }}
                        >
                            ✏️ Edit
                        </button>
                    )}
                </div>
                <article className="blog-detail-card">
                    {/* Header */}
                    <div className="blog-detail-header">
                        <h1>{post.content.substring(0, 100)}</h1>
                        <div className="blog-detail-meta">
                            <span>📅 {formatDate(post.createdAt)}</span>
                           
                        </div>
                    </div>

                    {/* Images */}
                    {post.images && post.images.length > 0 && (
                        <div className="blog-detail-images">
                            {post.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={`http://localhost:5000${img}`}
                                    alt={`post-img-${idx}`}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div className="blog-detail-content">
                        {post.content}
                    </div>

                    {/* Tagged salons */}
                    {post.taggedSalonIds && post.taggedSalonIds.length > 0 && (
                        <div className="blog-service-link">
                            <h3>🏷️ Tagged salons:</h3>
                            <div className="service-card-inline">
                                {post.taggedSalonIds.map((s) => {
                                    const salonId = s?._id || s?.id || s;
                                    return (
                                        <div key={salonId} style={{ marginBottom: 8 }}>
                                            <a>
                                                <strong>{s?.name || s}</strong>
                                            </a>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {/* Tagged staff */}
                    {post.taggedStaffIds && post.taggedStaffIds.length > 0 && (
                        <div className="blog-service-link">
                            <h3>👥 Tagged staff:</h3>
                            <div className="service-card-inline">
                                {post.taggedStaffIds.map((s) => (
                                    <div key={s._id || s} style={{ marginBottom: 8 }}>
                                        <a
                                           
                                        >
                                            <strong>{s?.userId?.fullName || s?.fullName || s}</strong>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Service link */}
                    {linkedServices.length > 0 && (
                        <div className="blog-service-link">
                            <h3>📅 Services mentioned in this post:</h3>
                            <div className="service-card-inline">
                                {linkedServices.map((service) => (
                                    <div key={service._id || service} style={{ marginBottom: 12 }}>
                                        <strong>{service.name}</strong>
                                        <p>💰 Price: ${service.price}</p>
                                        <p>⏱️ Duration: {service.duration} minutes</p>
                                        
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </article>
            </div>
        </>
    );
};

export default PostDetail;
