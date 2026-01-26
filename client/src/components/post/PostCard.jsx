import React from 'react';
import { Link } from 'react-router-dom';
import '../../assets/css/PostCard.css';

const PostCard = ({ post }) => {
    // Determine thumbnail
    const thumbnail = post.images && post.images.length > 0
        ? `http://localhost:5000${post.images[0]}`
        : 'https://via.placeholder.com/600x400?text=No+Image';

    // Format date
    const date = new Date(post.createdAt).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    // Determine author info
    const authorName = post.author?.fullName || post.author?.name || 'Unknown Author';
    const authorAvatar = post.author?.avatar || post.author?.images?.[0]
        ? `http://localhost:5000${post.author?.avatar || post.author?.images?.[0]}`
        : 'https://via.placeholder.com/150';

    return (
        <article className="blog-card">
            <img src={thumbnail} alt="Post thumbnail" className="blog-card-image" />
            <div className="blog-card-content">
                <div className="blog-card-meta">
                    <span className={`blog-author-type ${post.authorType?.toLowerCase()}`}>
                        {post.authorType}
                    </span>
                    <span>•</span>
                    <span>{date}</span>
                </div>

                <h3 className="blog-card-title">
                    <Link to={`/post/${post._id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        {post.title || post.content?.substring(0, 60) + "..."}
                    </Link>
                </h3>

                <div className="blog-card-footer">
                    <div className="blog-author">
                        <img src={authorAvatar} alt={authorName} className="blog-author-avatar" />
                        <span className="blog-author-name">{authorName}</span>
                    </div>
                    <Link to={`/post/${post._id}`} className="read-more-btn">
                        Read More &rarr;
                    </Link>
                </div>
            </div>
        </article>
    );
};

export default PostCard;
