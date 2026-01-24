import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BlogCard from '../blog/BlogCard';
import '../../assets/css/BlogSection.css';

const BlogSection = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterSource, setFilterSource] = useState(''); // '' (All), 'Salon', 'Customer'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (Newest), 'asc' (Oldest)

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                setLoading(true);
                let url = 'http://localhost:5000/api/posts?limit=6';

                if (filterSource) {
                    url += `&authorType=${filterSource}`;
                }

                url += `&order=${sortOrder}`;

                const response = await axios.get(url);
                setPosts(response.data.posts || []);
            } catch (error) {
                console.error('Error fetching posts:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPosts();
    }, [filterSource, sortOrder]);

    return (
        <section className="blog-section">
            <div className="section-container">
                <div className="blog-section-header">
                    <h2 className="blog-section-title">Latest News & Stories</h2>

                    <div className="blog-controls">
                        <select
                            className="filter-select"
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                        >
                            <option value="">All Sources</option>
                            <option value="Salon">From Salons</option>
                            <option value="Customer">From Community</option>
                        </select>

                        <select
                            className="filter-select"
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        >
                            <option value="desc">Newest First</option>
                            <option value="asc">Oldest First</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-spinner">Loading stories...</div>
                ) : (
                    <div className="blog-grid">
                        {posts.length > 0 ? (
                            posts.map(post => (
                                <BlogCard key={post._id} post={post} />
                            ))
                        ) : (
                            <p>No posts found matching your criteria.</p>
                        )}
                    </div>
                )}
            </div>
        </section>
    );
};

export default BlogSection;
