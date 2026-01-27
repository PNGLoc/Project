//LocPNG
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreatePost, useUpdatePost, usePostById } from '../../features/posts/hooks/usePosts.js';
import axiosClient from '../../lib/axios.js';
//import HeaderHome from '../../components/layout/HeaderHome.jsx';
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
    const isCustomer = userRole === 'CUSTOMER' || userRole === 'STAFF';

    const [formData, setFormData] = useState({
        content: '',
        linkedServiceIds: [],
    });

    const [salons, setSalons] = useState([]);
    const [taggedSalonIds, setTaggedSalonIds] = useState([]);

    const [staffs, setStaffs] = useState([]);
    const [taggedStaffIds, setTaggedStaffIds] = useState([]);
    const [staffSearch, setStaffSearch] = useState('');

    const [services, setServices] = useState([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [salonSearch, setSalonSearch] = useState('');

    const [existingImages, setExistingImages] = useState([]); // stored URLs like /assets/...
    const [images, setImages] = useState([]); // new File[]
    const [imagePreviews, setImagePreviews] = useState([]); // previews for new File[]
    const [message, setMessage] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const loading = createLoading || updateLoading;
    const error = createError || updateError;

    const loadPost = async () => {
        try {
            const post = await getPostById(postId);
            const loadedLinkedIds = Array.isArray(post.linkedServiceIds)
                ? post.linkedServiceIds.map((s) => (typeof s === 'string' ? s : s?._id)).filter(Boolean)
                : (post.linkedServiceId ? [post.linkedServiceId?._id || post.linkedServiceId].filter(Boolean) : []);
            setFormData({
                content: post.content,
                linkedServiceIds: loadedLinkedIds,
            });
            const loadedTagged = (post.taggedSalonIds || []).map((s) => (typeof s === 'string' ? s : s?._id)).filter(Boolean);
            setTaggedSalonIds(loadedTagged);
            const loadedStaff = (post.taggedStaffIds || []).map((s) => (typeof s === 'string' ? s : s?._id)).filter(Boolean);
            setTaggedStaffIds(loadedStaff);
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
            const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setServices(list.filter((s) => s.isActive !== false));
        } catch (err) {
            console.error('Failed to load services:', err);
        }
    };

    const loadMyStaffs = async () => {
        try {
            const res = await axiosClient.get('/api/staffs');
            const list = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setStaffs(list.filter((s) => s.isActive !== false));
        } catch (err) {
            console.error('Failed to load staffs:', err);
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
            loadMyStaffs();
        }
    }, [isSalon]);

    const filteredSalons = useMemo(() => {
        const q = salonSearch.trim().toLowerCase();
        if (!q) return salons;
        return salons.filter((s) => (s.name || '').toLowerCase().includes(q));
    }, [salonSearch, salons]);

    const filteredStaffs = useMemo(() => {
        const q = staffSearch.trim().toLowerCase();
        if (!q) return staffs;
        return staffs.filter((s) => {
            const name = s?.userId?.fullName || s?.fullName || '';
            return name.toLowerCase().includes(q);
        });
    }, [staffSearch, staffs]);

    const filteredServices = useMemo(() => {
        const q = serviceSearch.trim().toLowerCase();
        if (!q) return services;
        return services.filter((s) => (s.name || '').toLowerCase().includes(q));
    }, [serviceSearch, services]);

    const selectedServices = useMemo(() => {
        const ids = new Set(formData.linkedServiceIds || []);
        return services.filter((s) => ids.has(s._id));
    }, [services, formData.linkedServiceIds]);

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

            if (isAdmin) {
                // Admin can optionally tag salons
            }

            const submitData = new FormData();
            submitData.append('content', formData.content);
            if (isSalon) {
                if (formData.linkedServiceIds && formData.linkedServiceIds.length > 0) {
                    formData.linkedServiceIds.forEach((id) => {
                        submitData.append('linkedServiceIds', id);
                    });
                } else if (isEditing) {
                    submitData.append('linkedServiceIds', '');
                }
            }

            if ((isAdmin || isCustomer) && taggedSalonIds && taggedSalonIds.length > 0) {
                taggedSalonIds.forEach((id) => {
                    submitData.append('taggedSalonIds', id);
                });
            }

            if (isSalon && taggedStaffIds && taggedStaffIds.length > 0) {
                taggedStaffIds.forEach((id) => {
                    submitData.append('taggedStaffIds', id);
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
                setMessage({ type: 'success', text: 'Post updated successfully!' });
            } else {
                await createPost(submitData);
                setMessage({ type: 'success', text: 'Post created successfully!' });
            }

            setTimeout(() => {
                navigate('/post/my-posts');
            }, 1500);
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.response?.data?.message || 'Failed to save post',
            });
        }
    };

    return (
        <>
            {/* Header and home-container moved to MainLayout */}

            <div className="post-form-container">
                <div className="post-form-card">
                    <h2 className="post-form-title">
                        {isEditing ? '✏️ Edit Post/News' : '✏️ Create New Post/News'}
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
                                {isAdmin && <span className="role-indicator">Admin</span>}
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
                                        placeholder="Write your post content here. Supports markdown formatting..."
                                    />
                                </div>
                            ) : (
                                // Customer/Salon gets regular textarea
                                <textarea
                                    id="content"
                                    name="content"
                                    value={formData.content}
                                    onChange={handleInputChange}
                                    placeholder="Write your post content here..."
                                />
                            )}
                        </div>

                        {/* SALON-specific: Service dropdown */}
                        {isSalon && (
                            <div className="salon-service-section">
                                <label className="service-dropdown-label">
                                    Link Services (Optional)
                                </label>
                                {services.length > 0 ? (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Search services to link..."
                                            value={serviceSearch}
                                            onChange={(e) => setServiceSearch(e.target.value)}
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
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                                gap: 8,
                                            }}
                                        >
                                            {filteredServices.map((s) => {
                                                const checked = (formData.linkedServiceIds || []).includes(s._id);
                                                return (
                                                    <div
                                                        key={s._id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                linkedServiceIds: checked
                                                                    ? (prev.linkedServiceIds || []).filter((id) => id !== s._id)
                                                                    : [...(prev.linkedServiceIds || []), s._id],
                                                            }));
                                                            setMessage(null);
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    linkedServiceIds: checked
                                                                        ? (prev.linkedServiceIds || []).filter((id) => id !== s._id)
                                                                        : [...(prev.linkedServiceIds || []), s._id],
                                                                }));
                                                                setMessage(null);
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: 10,
                                                            border: checked ? '2px solid #0d9488' : '1px solid #e5e7eb',
                                                            background: checked ? '#ecfdf5' : '#fff',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            color: '#0f172a',
                                                        }}
                                                        title={checked ? 'Click to unlink' : 'Click to link'}
                                                    >
                                                        {s.name} (${s.price})
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {selectedServices.length > 0 && (
                                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {selectedServices.map((s) => (
                                                    <button
                                                        key={s._id}
                                                        type="button"
                                                        onClick={() =>
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                linkedServiceIds: (prev.linkedServiceIds || []).filter((id) => id !== s._id),
                                                            }))
                                                        }
                                                        style={{
                                                            border: '1px solid #ddd',
                                                            background: '#f7f7f7',
                                                            padding: '6px 10px',
                                                            borderRadius: 999,
                                                            cursor: 'pointer',
                                                        }}
                                                        title="Remove"
                                                    >
                                                        {s.name} ✕
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ color: '#777', fontSize: 14 }}>
                                        No services found. Create services first in your salon dashboard.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CUSTOMER/Admin: Tag salons */}
                        {(isAdmin || isCustomer) && (
                            <div className="form-group">
                                <label>
                                    {isCustomer ? 'Check-in Salon (Optional)' : 'Tag Salons (Optional)'}
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
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                                gap: 8,
                                            }}
                                        >
                                            {filteredSalons.map((s) => {
                                                const checked = taggedSalonIds.includes(s._id);
                                                return (
                                                    <div
                                                        key={s._id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => {
                                                            setTaggedSalonIds((prev) =>
                                                                checked ? prev.filter((id) => id !== s._id) : [...prev, s._id]
                                                            );
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setTaggedSalonIds((prev) =>
                                                                    checked ? prev.filter((id) => id !== s._id) : [...prev, s._id]
                                                                );
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: 10,
                                                            border: checked ? '2px solid #0d9488' : '1px solid #e5e7eb',
                                                            background: checked ? '#ecfdf5' : '#fff',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            color: '#0f172a',
                                                        }}
                                                        title={checked ? 'Click to untag' : 'Click to tag'}
                                                    >
                                                        {s.name}
                                                    </div>
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
                                        ? 'Customer/Staff: salon check-in is optional.'
                                        : 'Admin: tagging salons is optional.'}
                                </div>
                            </div>
                        )}

                        {/* SALON: Tag staff */}
                        {isSalon && (
                            <div className="form-group">
                                <label>Tag Staff (Optional)</label>

                                {staffs.length === 0 ? (
                                    <div style={{ color: '#777', fontSize: 14 }}>No staff found to tag.</div>
                                ) : (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Search staff to tag..."
                                            value={staffSearch}
                                            onChange={(e) => setStaffSearch(e.target.value)}
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
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                                gap: 8,
                                            }}
                                        >
                                            {filteredStaffs.map((s) => {
                                                const id = s._id;
                                                const name = s?.userId?.fullName || s?.fullName || 'Staff';
                                                const checked = taggedStaffIds.includes(id);
                                                return (
                                                    <div
                                                        key={id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => {
                                                            setTaggedStaffIds((prev) =>
                                                                checked ? prev.filter((x) => x !== id) : [...prev, id]
                                                            );
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                setTaggedStaffIds((prev) =>
                                                                    checked ? prev.filter((x) => x !== id) : [...prev, id]
                                                                );
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '8px 10px',
                                                            borderRadius: 10,
                                                            border: checked ? '2px solid #0d9488' : '1px solid #e5e7eb',
                                                            background: checked ? '#ecfdf5' : '#fff',
                                                            cursor: 'pointer',
                                                            fontWeight: 600,
                                                            color: '#0f172a',
                                                        }}
                                                        title={checked ? 'Click to untag' : 'Click to tag'}
                                                    >
                                                        {name}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {taggedStaffIds.length > 0 && (
                                            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {taggedStaffIds.map((id) => {
                                                    const staff = staffs.find((s) => s._id === id);
                                                    const name = staff?.userId?.fullName || staff?.fullName || id;
                                                    return (
                                                        <button
                                                            key={id}
                                                            type="button"
                                                            onClick={() => setTaggedStaffIds((prev) => prev.filter((x) => x !== id))}
                                                            style={{
                                                                border: '1px solid #ddd',
                                                                background: '#f7f7f7',
                                                                padding: '6px 10px',
                                                                borderRadius: 999,
                                                                cursor: 'pointer',
                                                            }}
                                                            title="Remove"
                                                        >
                                                            {name} ✕
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                {loading ? 'Saving...' : (isEditing ? '💾 Update Post' : '✨ Create Post')}
                            </button>
                            <button
                                type="button"
                                className="btn-cancel"
                                onClick={() => navigate('/post/my-posts')}
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
