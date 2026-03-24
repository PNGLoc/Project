import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FiEdit, FiFilter, FiChevronDown, FiZap, FiClock, FiXCircle } from 'react-icons/fi';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ui/ConfirmModal';
import '../../assets/css/SalonDashboard.css';

// Quản lý dịch vụ (Service Management) cho Salon Owner

const ServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [activeFlashsales, setActiveFlashsales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterMenuRef = useRef(null);
    const [notification, setNotification] = useState(null);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', price: '', duration: '', description: '', categoryId: '', isActive: true,
        type: 'SINGLE', comboItems: []
    });

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        pendingData: null,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    // Biến số thành chuỗi có dấu phẩy: 100000 -> "100,000"
    const formatNumber = (num) => {
        if (!num) return "";
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    // Biến chuỗi có dấu phẩy thành số để lưu: "100,000" -> 100000
    const cleanNumber = (str) => {
        return str.replace(/,/g, "");
    };

    const fetchServices = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/api/services/owner');
            // Chấp nhận cả định dạng mảng trực tiếp (đề phòng chưa update server) và định dạng { data: [...] }
            const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setServices(data);
        } catch (error) {
            console.error("Fetch services error:", error);
            if (error.response?.status === 401) {
                toast.error("Session expired or unauthorized. Please login again.");
            } else {
                const msg = error.response?.data?.message || "Could not load services list. Please check your salon status.";
                toast.error("Error: " + msg);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axiosClient.get('/api/categories');
            setCategories(res.data?.data || []);
        } catch (error) {
            console.error("Fetch categories error:", error);
        }
    }, []);

    const fetchFlashsales = useCallback(async () => {
        try {
            const res = await axiosClient.get('/api/flashsales/owner');
            const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setActiveFlashsales(data);
        } catch (error) {
            console.error("Fetch flashsales error", error);
        }
    }, []);

    useEffect(() => {
        fetchServices();
        fetchCategories();
        fetchFlashsales();
    }, [fetchServices, fetchCategories, fetchFlashsales]);

    const getFlashsaleForService = (serviceId) => {
        const sorted = [...activeFlashsales].sort((a, b) => {
            const p = { 'Active': 1, 'Upcoming': 2, 'Expired': 3 };
            return (p[a.status] || 4) - (p[b.status] || 4);
        });
        for (const fs of sorted) {
            const found = fs.services.find(s => (s.serviceId._id || s.serviceId) === serviceId);
            if (found) {
                return { name: fs.name, status: fs.status };
            }
        }
        return null;
    };

    const handleOpenCreate = () => {
        setEditId(null);
        setFormData({ name: '', price: '', duration: '', description: '', categoryId: '', isActive: true, type: 'SINGLE', comboItems: [] });
        setShowModal(true);
    };

    const handleEdit = (service) => {
        setEditId(service._id);
        setFormData({
            name: service.name,
            price: service.price,
            duration: service.duration,
            description: service.description || '',
            categoryId: service.categoryId || '',
            isActive: service.isActive,
            type: service.type || 'SINGLE',
            comboItems: (service.comboItems || []).map(item => typeof item === 'object' ? item._id : item)
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Kiểm tra tên không chứa số (Validation)
        if (/\d/.test(formData.name)) {
            toast.warning("Service name cannot contain numbers");
            return;
        }

        try {
            const payload = {
                ...formData,
                price: Number(formData.price),
                duration: Number(formData.duration)
            };

            if (editId) {
                await axiosClient.put(`/api/services/${editId}`, payload);
                setNotification({ type: 'success', message: 'Service updated successfully!' });
            } else {
                await axiosClient.post('/api/services/create', payload);
                setNotification({ type: 'success', message: 'New service created successfully!' });
            }

            setShowModal(false);
            fetchServices();

            // Tự động tắt thông báo sau 5 giây
            setTimeout(() => setNotification(null), 5000);

        } catch (error) {
            const errorMsg = error.response?.data?.message || "Unknown error occurred";
            setNotification({ type: 'error', message: 'Error: ' + errorMsg });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    const handleHide = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hide Service',
            message: 'Are you sure you want to hide this service from the public menu?',
            onConfirm: async () => {
                try {
                    await axiosClient.patch(`/api/services/${id}/hide`, {});
                    toast.success('Service hidden successfully!');
                    fetchServices();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    const errorMsg = error.response?.data?.message || error.message;
                    toast.error('Could not hide service: ' + errorMsg);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        try {
            await axiosClient.post('/api/categories', { name: newCategoryName });
            setNewCategoryName('');
            setShowCategoryModal(false);
            fetchCategories();
            setNotification({ type: 'success', message: 'Category created successfully!' });
            setTimeout(() => setNotification(null), 5000);
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            setNotification({ type: 'error', message: 'Error creating category: ' + errorMsg });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    // Close filter menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Effect to auto-calculate price and duration for Combos
    useEffect(() => {
        if (formData.type === 'COMBO' && formData.comboItems.length > 0) {
            const selectedServices = services.filter(s => formData.comboItems.includes(s._id));
            const totalP = selectedServices.reduce((sum, s) => sum + s.price, 0);
            const totalD = selectedServices.reduce((sum, s) => sum + s.duration, 0);

            // Apply a default 10% discount for the combo
            const discountedPrice = Math.floor(totalP * 0.9 / 1000) * 1000; // Round to nearest 1000

            setFormData(prev => ({
                ...prev,
                // Update price and duration automatically
                price: discountedPrice,
                duration: totalD
            }));
        }
    }, [formData.comboItems.length, formData.type]); // Only trigger when items are added/removed

    const filteredServices = useMemo(() => {
        if (filterCategory === 'all') return services;
        if (filterCategory === 'uncategorized') return services.filter(s => !s.categoryId);
        if (filterCategory === 'combos') return services.filter(s => s.type === 'COMBO');
        return services.filter(s => s.categoryId === filterCategory);
    }, [services, filterCategory]);

    // Render loading state
    if (loading && services.length === 0) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="service-management-container">
            {notification && (
                <div className={`toast-notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
            <div className="service-header" style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn-add-service" onClick={handleOpenCreate}>
                    + Add New Service
                </button>
                <button className="btn-secondary" onClick={() => setShowCategoryModal(true)}>
                    Manage Categories
                </button>

                <div className="filter-dropdown-container" style={{ marginLeft: 'auto' }} ref={filterMenuRef}>
                    <button
                        className="btn-filter-calendar"
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                    >
                        <FiFilter size={16} />
                        <span>
                            {filterCategory === 'all' ? 'All Categories' :
                                filterCategory === 'uncategorized' ? 'Uncategorized' :
                                    filterCategory === 'combos' ? 'Combos Only' :
                                        categories.find(c => c._id === filterCategory)?.name}
                        </span>
                        <FiChevronDown size={14} />
                    </button>

                    {showFilterMenu && (
                        <div className="filter-menu">
                            <div
                                className={`filter-menu-item ${filterCategory === 'all' ? 'selected' : ''}`}
                                onClick={() => { setFilterCategory('all'); setShowFilterMenu(false); }}
                            >
                                All Categories
                            </div>
                            <div
                                className={`filter-menu-item ${filterCategory === 'uncategorized' ? 'selected' : ''}`}
                                onClick={() => { setFilterCategory('uncategorized'); setShowFilterMenu(false); }}
                            >
                                Uncategorized
                            </div>
                            <div
                                className={`filter-menu-item ${filterCategory === 'combos' ? 'selected' : ''}`}
                                onClick={() => { setFilterCategory('combos'); setShowFilterMenu(false); }}
                            >
                                Combos Only
                            </div>
                            <div className="filter-divider"></div>
                            {categories.map(cat => (
                                <div
                                    key={cat._id}
                                    className={`filter-menu-item ${filterCategory === cat._id ? 'selected' : ''}`}
                                    onClick={() => { setFilterCategory(cat._id); setShowFilterMenu(false); }}
                                >
                                    {cat.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="service-data-card">
                {filteredServices.length === 0 ? (
                    <div className="empty-state">
                        {filterCategory === 'all'
                            ? "There are no services yet. Please add a new service."
                            : "No services found in this category."}
                    </div>
                ) : (
                    <table className="service-table">
                        <thead>
                            <tr>
                                <th>Service Name</th>
                                <th>Category</th>
                                <th>Price (VND)</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServices.map((s) => (
                                <tr key={s._id} className={s.isActive ? '' : 'row-hidden'}>
                                    <td style={{ position: 'relative', overflow: 'hidden' }}>
                                        {(() => {
                                            const fs = getFlashsaleForService(s._id);
                                            if (fs) {
                                                const bgColors = { 'Active': '#ef4444', 'Upcoming': '#10b981', 'Expired': '#94a3b8' };
                                                const Icons = { 'Active': FiZap, 'Upcoming': FiClock, 'Expired': FiXCircle };
                                                const Icon = Icons[fs.status] || FiZap;
                                                return (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        left: '-18px',
                                                        backgroundColor: bgColors[fs.status] || '#94a3b8',
                                                        color: 'white',
                                                        fontSize: '12px',
                                                        width: '64px',
                                                        textAlign: 'center',
                                                        transform: 'rotate(-45deg)',
                                                        zIndex: 0,
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                                    }} title={`Flashsale: ${fs.name} (${fs.status})`}>
                                                        <Icon size={12} style={{ verticalAlign: 'middle', marginBottom: '2px' }} />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, paddingLeft: getFlashsaleForService(s._id) ? '18px' : '0' }}>
                                            <span className="service-name">{s.name}</span>
                                            {s.type === 'COMBO' && (
                                                <span className="combo-badge">COMBO ({s.comboItems?.length || 0} items)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className="category-tag">
                                            {categories.find(c => c._id === s.categoryId)?.name || 'Uncategorized'}
                                        </span>
                                    </td>
                                    <td>{Number(s.price).toLocaleString()} VND</td>
                                    <td>{s.duration} min</td>
                                    <td>
                                        <span className={`status-badge ${s.isActive ? 'status-active' : 'status-hidden'}`}>
                                            {s.isActive ? 'Active' : 'Hidden'}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        <div className="action-buttons">
                                            <button className="btn-edit-service" onClick={() => handleEdit(s)}>
                                                <FiEdit size={18} color="#1e293b" style={{ marginRight: '5px' }} /> Edit
                                            </button>
                                            {s.isActive && (
                                                <button className="btn-hire-service" onClick={() => handleHide(s._id)}>Hide</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{editId ? 'Update Service' : 'Add New Service'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Service Type</label>
                                <div className="type-selector">
                                    <button
                                        type="button"
                                        className={`type-btn ${formData.type === 'SINGLE' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'SINGLE', comboItems: [] })}
                                    >
                                        Single Service
                                    </button>
                                    <button
                                        type="button"
                                        className={`type-btn ${formData.type === 'COMBO' ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, type: 'COMBO' })}
                                    >
                                        Combo Bundle
                                    </button>
                                </div>
                            </div>

                            {formData.type === 'COMBO' && (
                                <div className="form-group">
                                    <label>Select Services in Combo</label>
                                    <div className="combo-selection-list">
                                        {services.filter(s => s.type === 'SINGLE').map(s => (
                                            <label key={s._id} className="combo-item-checkbox">
                                                <div className="checkbox-flex-container">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.comboItems.includes(s._id)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                comboItems: checked
                                                                    ? [...prev.comboItems, s._id]
                                                                    : prev.comboItems.filter(id => id !== s._id)
                                                            }));
                                                        }}
                                                    />
                                                    <span className="combo-item-name">{s.name}</span>
                                                    <span className="combo-item-price">{formatNumber(s.price)} VND</span>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.comboItems.length > 0 && (
                                        <p className="combo-hint">
                                            Total: {formatNumber(services.filter(s => formData.comboItems.includes(s._id)).reduce((a, b) => a + b.price, 0))} VNĐ.
                                            <span style={{ color: '#059669', fontWeight: 'bold', marginLeft: '5px' }}>
                                                Applied 10% Discount!
                                            </span>
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Service Name</label>
                                <input
                                    type="text" required
                                    placeholder='e.g., VIP Hair Combo'
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>Category</label>
                                <select
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="form-select"
                                >
                                    <option value="">Select a category (Optional)</option>
                                    {categories.map(cat => (
                                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price (VND)</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g., 100,000"
                                        /* Use Intl to force comma formatting every 3 digits */
                                        value={formData.price ? new Intl.NumberFormat('en-US').format(formData.price) : ''}
                                        onChange={(e) => {
                                            // Block non-numeric characters, only allow raw numbers
                                            const rawValue = e.target.value.replace(/\D/g, "");
                                            setFormData({ ...formData, price: rawValue });
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Duration (minutes)</label>
                                    <input
                                        type="number" required min="1" placeholder="1"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Service Description</label>
                                <textarea
                                    rows="3"
                                    placeholder='Detailed description of the service...'
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                /* Fixed empty description handling */
                                ></textarea>
                            </div>

                            {editId && (
                                <div className="status-toggle">
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                    <span>{formData.isActive ? 'Active' : 'Inactive'}</span>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                    {editId ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showCategoryModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Manage Categories</h3>
                            <button className="close-btn" onClick={() => setShowCategoryModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateCategory}>
                            <div className="form-group">
                                <label>Category Name</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        placeholder="e.g., Hair, Nails..."
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        style={{ flex: 1 }}
                                    />
                                    <button type="submit" className="btn-primary">Add</button>
                                </div>
                            </div>
                        </form>
                        <div className="category-list" style={{ marginTop: '20px' }}>
                            <h4>Existing Categories</h4>
                            {categories.length === 0 ? (
                                <p>No categories yet.</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {categories.map(cat => (
                                        <li key={cat._id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '10px',
                                            borderBottom: '1px solid #e2e8f0',
                                            alignItems: 'center'
                                        }}>
                                            <span>{cat.name}</span>
                                            <button
                                                className="btn-reject-rose"
                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                onClick={() => {
                                                    setConfirmModal({
                                                        isOpen: true,
                                                        title: 'Delete Category',
                                                        message: `Are you sure you want to delete the category "${cat.name}"? This will not delete the services, but they will become uncategorized.`,
                                                        onConfirm: async () => {
                                                            try {
                                                                await axiosClient.delete(`/api/categories/${cat._id}`);
                                                                fetchCategories();
                                                                fetchServices();
                                                                toast.success('Category deleted successfully!');
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            } catch (error) {
                                                                const errorMsg = error.response?.data?.message || "Delete failed";
                                                                toast.error('Error: ' + errorMsg);
                                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                            }
                                                        }
                                                    });
                                                }}
                                            >Delete</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                confirmText={confirmModal.title.includes('Delete') ? 'Delete' : 'Confirm'}
                type={confirmModal.title.includes('Delete') || confirmModal.title.includes('Hide') ? 'danger' : 'primary'}
            />
        </div>
    );
};

export default ServiceManagement;
