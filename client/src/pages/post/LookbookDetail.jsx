import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLookbookById } from '../../features/posts/hooks/usePosts.js';
import '../../assets/css/LookbookDetail.css'; // We'll create this CSS

const LookbookDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getLookbookById, loading, error } = useLookbookById();
    const [post, setPost] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const loadPost = async () => {
            try {
                const data = await getLookbookById(id);
                setPost(data);
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
        </div>
    );
};

export default LookbookDetail;
