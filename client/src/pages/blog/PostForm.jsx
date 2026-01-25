import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreatePost, useUpdatePost, usePostById } from '../../features/posts/hooks/usePosts.js';
import axiosClient from '../../lib/axios.js';
import HeaderHome from '../../components/layout/HeaderHome.jsx';
import '../../assets/css/PostForm.css';

const PostForm = () => {
    const navigate = useNavigate();
    const { id: postId } = useParams();

    const { createPost, loading: createLoading, error: createError } = useCreatePost();
    const { updatePost, loading: updateLoading, error: updateError } = useUpdatePost();
    const { getPostById } = usePostById();

    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const userRole = currentUser?.role;
    const isAdmin = userRole === 'ADMIN';
    const isSalon = userRole === 'SALON_OWNER';
    const isCustomer = userRole === 'CUSTOMER';

    const [formData, setFormData] = useState({
        content: '',
        linkedServiceId: '',
    });

    const [salons, setSalons] = useState([]);
    const [taggedSalonIds, setTaggedSalonIds] = useState([]);

    const [services, setServices] = useState([]);
    const [salonSearch, setSalonSearch] = useState('');

    const [existingImages, setExistingImages] = useState([]); // stored URLs like /assets/...
    const [images, setImages] = useState([]); // new File[]
    const [imagePreviews, setImagePreviews] = useState([]); // previews for new File[]
    const [message, setMessage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [linkedService, setLinkedService] = useState(null);

    const loading = createLoading || updateLoading;
    const error = createError || updateError;

    const loadPost = async () => {
        try {
            const post = await getPostById(postId);
            setFormData({
                content: post.content,
                linkedServiceId: post.linkedServiceId?._id || '',
            });
            const loadedTagged = (post.taggedSalonIds || []).map((s) => (typeof s === 'string' ? s : s?._id)).filter(Boolean);
            setTaggedSalonIds(loadedTagged);
            setLinkedService(post.linkedServiceId);
            setExistingImages(Array.isArray(post.images) ? post.images : []);
            setImages([]);
            setImagePreviews([]);
            setIsEditing(true);
        } catch (err) {
            console.error('Failed to load post:', err);
            setMessage({ type: 'error', text: 'Failed to load post' });
        }
    };

    const loadSalons = async () => {
        try {
            const res = await axiosClient.get('/api/salons');
            setSalons(res.data || []);
        } catch (err) {
            console.error('Failed to load salons:', err);
        }
    };

    const loadMyServices = async () => {
        try {
            const res = await axiosClient.get('/api/services/owner');
            const list = Array.isArray(res.data) ? res.data : [];
            setServices(list.filter((s) => s.isActive !== false));
        } catch (err) {
            console.error('Failed to load services:', err);
        }
    };

    useEffect(() => {
        if (postId) {
            loadPost();
        }
    }, [postId, getPostById]);

    useEffect(() => {
        if (isAdmin || isCustomer) {
            loadSalons();
        }
    }, [isAdmin, isCustomer]);

    useEffect(() => {
        if (isSalon) {
            loadMyServices();
        }
    }, [isSalon]);

    const filteredSalons = useMemo(() => {
        const q = salonSearch.trim().toLowerCase();
        if (!q) return salons;
        return salons.filter((s) => (s.name || '').toLowerCase().includes(q));
    }, [salonSearch, salons]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setMessage(null);
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        const maxFiles = 5;

        const currentCount = (existingImages?.length || 0) + (imagePreviews?.length || 0);
        if (currentCount + files.length > maxFiles) {
            setMessage({
                type: 'error',
                text: `Maximum ${maxFiles} images allowed`,
            });
            return;
        }

        setImages(prev => [...prev, ...files]);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreviews(prev => [...prev, e.target.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeExistingImage = (index) => {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index) => {
        setImagePreviews((prev) => prev.filter((_, i) => i !== index));
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleImageChange({ target: { files } });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage(null);

        try {
            if (!formData.content || formData.content.trim().length === 0) {
                setMessage({ type: 'error', text: 'Content is required' });
                return;
            }

            if (isSalon) {
                const remainingImagesCount = (existingImages?.length || 0) + (images?.length || 0);
                if (remainingImagesCount === 0) {
                    setMessage({ type: 'error', text: 'Salon posts must include at least 1 image' });
                    return;
                }
            }

            if (isSalon) {
                if (!formData.linkedServiceId) {
                    setMessage({ type: 'error', text: 'linkedServiceId is required for salon posts' });
                    return;
                }
            }

            if (isAdmin) {
                if (!taggedSalonIds || taggedSalonIds.length < 1) {
                    setMessage({ type: 'error', text: 'Please tag at least 1 salon' });
                    return;
                }
            }

            if (isCustomer) {
                if (!taggedSalonIds || taggedSalonIds.length !== 1) {
                    setMessage({ type: 'error', text: 'Please select exactly 1 salon to check-in' });
                    return;
                }
            }

            const submitData = new FormData();
            submitData.append('content', formData.content);
            if (isSalon && formData.linkedServiceId) {
                submitData.append('linkedServiceId', formData.linkedServiceId);
            }

            if ((isAdmin || isCustomer) && taggedSalonIds && taggedSalonIds.length > 0) {
                taggedSalonIds.forEach((id) => {
                    submitData.append('taggedSalonIds', id);
                });
            }

            images.forEach(file => {
                submitData.append('images', file);
            });

            // Important: on update, tell server which existing images should be kept.
            if (isEditing) {
                submitData.append('existingImagesJson', JSON.stringify(existingImages || []));
            }

            if (isEditing) {
                await updatePost(postId, submitData);
                setMessage({ type: 'success', text: 'Blog updated successfully!' });
            } else {
                await createPost(submitData);
                setMessage({ type: 'success', text: 'Blog created successfully!' });
            }

            setTimeout(() => {
                navigate('/blog/my-blogs');
            }, 1500);
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to save blog',
            });
        }
    };

    return (
        <>
            {/* Header and home-container moved to MainLayout */}

            <div className="post-form-container">
                <div className="post-form-card">
                    <h2 className="post-form-title">
                        {isEditing ? '✏️ Edit Blog/News' : '✏️ Create New Blog/News'}
                    </h2>

                    {message && (
                        <div className={`form-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {error && <div className="form-message error">❌ {error}</div>}

                    <form onSubmit={handleSubmit}>
                        {/* CONTENT - Different UI based on role */}
                        <div className="form-group">
                            <label htmlFor="content" className="required">
                                Content
                                {isAdmin && <span className="role-indicator">Admin - RichText</span>}
                                {isSalon && <span className="role-indicator">Salon</span>}
                            </label>

                            {isAdmin ? (
                                // Admin gets rich text editor
                                <div className="rich-text-editor-wrapper">
                                    <div className="rich-text-toolbar">
                                        <button type="button" onClick={(e) => {
                                            e.preventDefault();
                                            const textarea = document.getElementById('content');
                                            const start = textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const text = textarea.value;
                                            textarea.value = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
                                            setFormData(prev => ({ ...prev, content: textarea.value }));
                                        }}>
                                            <strong>B</strong>
                                        </button>
                                        <button type="button" onClick={(e) => {
                                            e.preventDefault();
                                            const textarea = document.getElementById('content');
                                            const start = textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const text = textarea.value;
                                            textarea.value = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
                                            setFormData(prev => ({ ...prev, content: textarea.value }));
                                        }}>
                                            <em>I</em>
                                        </button>
                                        <button type="button" onClick={(e) => {
                                            e.preventDefault();
                                            const textarea = document.getElementById('content');
                                            const start = textarea.selectionStart;
                                            const end = textarea.selectionEnd;
                                            const text = textarea.value;
                                            textarea.value = text.substring(0, start) + '\n\n---\n\n' + text.substring(start);
                                            setFormData(prev => ({ ...prev, content: textarea.value }));
                                        }}>
                                            H-Line
                                        </button>
                                    </div>
                                    <textarea
                                        id="content"
                                        className="rich-text-editor"
                                        name="content"
                                        value={formData.content}
                                        onChange={handleInputChange}
                                        placeholder="Write your blog content here. Supports markdown formatting..."
                                    />
                                </div>
                            ) : (
                                // Customer/Salon gets regular textarea
                                <textarea
                                    id="content"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleInputChange}
                                    placeholder="Write your blog content here..."
                                />
                            )}
                        </div>

                        {/* SALON-specific: Service dropdown */}
                        {isSalon && (
                            <div className="salon-service-section">
                                <label className="service-dropdown-label">
                                    Link a Service (Required)
                                </label>
                                {services.length > 0 ? (
                                    <select
                                        name="linkedServiceId"
                                        value={formData.linkedServiceId}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            setFormData((prev) => ({ ...prev, linkedServiceId: id }));
                                            const s = services.find((x) => x._id === id) || null;
                                            setLinkedService(s);
                                            setMessage(null);
                                        }}
                                    >
                                        <option value="">-- Select a service --</option>
                                        {services.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.name} (${s.price})
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ color: '#777', fontSize: 14 }}>
                                        No services found. Create services first in your salon dashboard.
                                    </div>
                                )}
                                {linkedService && (
                                    <div className="service-selected-info">
                                        <p><strong>{linkedService.name}</strong></p>
                                        <p>Price: ${linkedService.price}</p>
                                        <p>Duration: {linkedService.duration} min</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CUSTOMER/Admin: Tag salons */}
                        {(isAdmin || isCustomer) && (
                            <div className="form-group">
                                <label className="required">
                                    {isCustomer ? 'Check-in Salon (Required)' : 'Tag Salons (Required)'}
                                </label>

                                {salons.length === 0 ? (
                                    <div style={{ color: '#777', fontSize: 14 }}>No salons found to tag.</div>
                                ) : isCustomer ? (
                                    <select
                                        value={taggedSalonIds[0] || ''}
                                        onChange={(e) => setTaggedSalonIds(e.target.value ? [e.target.value] : [])}
                                    >
                                        <option value="">-- Select a salon --</option>
                                        {salons.map((s) => (
                                            <option key={s._id} value={s._id}>
                                                {s.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Search salons to tag..."
                                            value={salonSearch}
                                            onChange={(e) => setSalonSearch(e.target.value)}
                                        />

                                        <div
                                            style={{
                                                marginTop: 8,
                                                border: '1px solid #ddd',
                                                borderRadius: 8,
                                                padding: 10,
                                                maxHeight: 220,
                                                overflow: 'auto',
                                                background: '#fff',
                                            }}
                                        >
                                            {filteredSalons.map((s) => {
                                                const checked = taggedSalonIds.includes(s._id);
                                                return (
                                                    <label
                                                        key={s._id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 8,
                                                            padding: '6px 4px',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() => {
                                                                setTaggedSalonIds((prev) =>
                                                                    checked ? prev.filter((id) => id !== s._id) : [...prev, s._id]
                                                                );
                                                            }}
                                                        />
                                                        <span>{s.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {taggedSalonIds.length > 0 && (
                                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {taggedSalonIds.map((id) => {
                                                    const salon = salons.find((s) => s._id === id);
                                                    return (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => setTaggedSalonIds((prev) => prev.filter((x) => x !== id))}
                                                            style={{
                                                                border: '1px solid #ddd',
                                                                background: '#f7f7f7',
                                                                padding: '6px 10px',
                                                                borderRadius: 999,
                                                                cursor: 'pointer',
                                                            }}
                                                            title="Remove"
                                                        >
                                                            {salon?.name || id} ✕
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div style={{ color: '#777', fontSize: 12, marginTop: 6 }}>
                                    {isCustomer
                                        ? 'Customer: tag exactly 1 salon (check-in).'
                                        : 'Admin: select one or more salons for PR/toplist.'}
                                </div>
                            </div>
                        )}

                        {/* IMAGE UPLOAD */}
                        <div className="form-group">
                            <label>Images (Max 5)</label>
                            <div
                                className="image-upload-section"
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    id="images"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="image-upload-input"
                                />
                                <label htmlFor="images" style={{ cursor: 'pointer', marginBottom: 0 }}>
                                    <p className="image-upload-text">
                                        📁 Drag & drop images here or click to select
                                    </p>
                                </label>
                            </div>

                            {(existingImages.length > 0 || imagePreviews.length > 0) && (
                                <div className="image-preview-grid">
                                    {existingImages.map((url, idx) => (
                                        <div key={`existing-${idx}`} className="image-preview-item">
                                            <img
                                                className="image-preview-img"
                                                src={`http://localhost:5000${url}`}
                                                alt={`existing-${idx}`}
                                            />
                                            <button
                                                type="button"
                                                className="image-remove-btn"
                                                onClick={() => removeExistingImage(idx)}
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}

                                    {imagePreviews.map((preview, idx) => (
                                        <div key={`new-${idx}`} className="image-preview-item">
                                            <img
                                                className="image-preview-img"
                                                src={preview}
                                                alt={`new-${idx}`}
                                            />
                                            <button
                                                type="button"
                                                className="image-remove-btn"
                                                onClick={() => removeNewImage(idx)}
                                                title="Remove"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ACTIONS */}
                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn-submit"
                                disabled={loading}
                            >
                                {loading ? 'Saving...' : (isEditing ? '💾 Update Blog' : '✨ Create Blog')}
                            </button>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => navigate('/blog/my-blogs')}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

export default PostForm;
