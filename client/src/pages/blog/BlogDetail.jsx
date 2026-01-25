import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostById } from '../../features/posts/hooks/usePosts.js';
import HeaderHome from '../../components/layout/HeaderHome.jsx';
import '../../assets/css/BlogDetail.css';

const BlogDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPostById, loading, error } = usePostById();

    const [blog, setBlog] = useState(null);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const loadBlog = async () => {
        try {
            const data = await getPostById(id);
            setBlog(data);
        } catch (err) {
            console.error('Failed to load blog:', err);
        }
    };

    useEffect(() => {
        loadBlog();
    }, [id, getPostById]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                Loading blog...
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#d32f2f' }}>
                <h2>Blog not found</h2>
                <button onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    ← Back to Home
                </button>
            </div>
        );
    }

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const canEdit = currentUser._id === blog.authorId;

    return (
        <>
            <HeaderHome />

            <div className="blog-detail-container">
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '8px 16px',
                        background: '#f0f0f0',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginBottom: '20px',
                        fontWeight: '600',
                    }}
                >
                    ← Back to Home
                </button>

                <article className="blog-detail-card">
                    {/* Header */}
                    <div className="blog-detail-header">
                        <h1>{blog.content.substring(0, 100)}</h1>
                        <div className="blog-detail-meta">
                            <span>📅 {formatDate(blog.createdAt)}</span>
                            <span>
                                👤{' '}
                                <a
                                    href="#"
                                    className="blog-link"
                                    onClick={(e) => e.preventDefault()}
                                    title="Profile coming soon"
                                >
                                    {blog.author?.fullName || blog.author?.name || 'Unknown'}
                                </a>
                            </span>
                            <span>📝 {blog.authorType}</span>
                        </div>
                    </div>

                    {/* Images */}
                    {blog.images && blog.images.length > 0 && (
                        <div className="blog-detail-images">
                            {blog.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={`http://localhost:5000${img}`}
                                    alt={`blog-img-${idx}`}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Content */}
                    <div className="blog-detail-content">
                        {blog.content}
                    </div>

                    {/* Tagged salons */}
                    {blog.taggedSalonIds && blog.taggedSalonIds.length > 0 && (
                        <div className="blog-service-link">
                            <h3>🏷️ Tagged salons:</h3>
                            <div className="service-card-inline">
                                {blog.taggedSalonIds.map((s) => (
                                    <div key={s._id || s} style={{ marginBottom: 8 }}>
                                        <a
                                            href="#"
                                            className="blog-link"
                                            onClick={(e) => e.preventDefault()}
                                            title="Profile coming soon"
                                        >
                                            <strong>{s.name || s}</strong>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {blog.taggedStaffIds && blog.taggedStaffIds.length > 0 && (
                        <div className="blog-service-link">
                            <h3>👥 Tagged staff:</h3>
                            <div className="service-card-inline">
                                {blog.taggedStaffIds.map((s) => (
                                    <div key={s._id || s} style={{ marginBottom: 8 }}>
                                        <a
                                            href="#"
                                            className="blog-link"
                                            onClick={(e) => e.preventDefault()}
                                            title="Profile coming soon"
                                        >
                                            <strong>{s?.userId?.fullName || s?.fullName || s}</strong>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Service link */}
                    {blog.linkedServiceId && (
                        <div className="blog-service-link">
                            <h3>📅 Service mentioned in this blog:</h3>
                            <div className="service-card-inline">
                                <strong>{blog.linkedServiceId.name}</strong>
                                <p>💰 Price: ${blog.linkedServiceId.price}</p>
                                <p>⏱️ Duration: {blog.linkedServiceId.duration} minutes</p>
                                <button
                                    style={{
                                        padding: '8px 16px',
                                        background: '#667eea',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        marginTop: '10px',
                                    }}
                                    onClick={() => navigate(`/service/${blog.linkedServiceId._id}`)}
                                >
                                    Book Now
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {canEdit && (
                        <div className="blog-detail-actions">
                            <button
                                onClick={() => navigate(`/blog/${blog._id}/edit`)}
                                style={{
                                    padding: '10px 20px',
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                }}
                            >
                                ✏️ Edit
                            </button>
                        </div>
                    )}
                </article>
            </div>
        </>
    );
};

export default BlogDetail;
