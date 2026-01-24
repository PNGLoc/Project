import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../../assets/css/SalonDashboard.css';

// Quản lý dịch vụ (Service Management) cho Salon Owner

const ServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', price: '', duration: '', description: '', isActive: true
    });
    const [editId, setEditId] = useState(null); // null = Create, có ID = Update

    const user = JSON.parse(localStorage.getItem('user'));
    const config = { headers: { Authorization: `Bearer ${user?.token}` } };

    const fetchServices = useCallback(async () => {
        if (!user?.token) return;
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:5000/api/services/owner', config);
            setServices(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    // Mở modal để tạo mới
    const handleOpenCreate = () => {
        setEditId(null);
        setFormData({ name: '', price: '', duration: '', description: '', isActive: true });
        setShowModal(true);
    };

    // Mở modal để chỉnh sửa
    const handleEdit = (service) => {
        setEditId(service._id);
        setFormData({
            name: service.name,
            price: service.price,
            duration: service.duration,
            description: service.description || '',
            isActive: service.isActive
        });
        setShowModal(true);
    };

    // Xử lý Gửi Form (Cả Create và Update)
    const handleSubmit = async (e) => {
        e.preventDefault();
        // --- BƯỚC KIỂM TRA DỮ LIỆU (VALIDATION) --

        if (/\d/.test(formData.name)) {
            alert("Service name cannot contain numbers");
            return;
        }

        try {
            if (editId) {
                // UPDATE: Sử dụng axios.put
                await axios.put(`http://localhost:5000/api/services/${editId}`, formData, config);
                console.log("Update successful!");
            } else {
                // CREATE: Sử dụng axios.post
                await axios.post('http://localhost:5000/api/services/create', formData, config);
                console.log("Create successful!");
            }

            setShowModal(false);
            setFormData({ name: '', price: '', duration: '', description: '', isActive: true });
            await fetchServices(); // Reload lại danh sách
        } catch (error) {
            console.error("Lỗi chi tiết:", error.response?.data);
            alert("Lỗi thao tác: " + (error.response?.data?.message || error.message));
        }
    };

    const handleHide = async (id) => {
        if (window.confirm("Are you sure you want to hide this service?")) {
            try {
                await axios.patch(`http://localhost:5000/api/services/${id}/hide`, {}, config);
                await fetchServices();
            } catch (error) {
                alert("Cannot hide service");
            }
        }
    };

    if (loading && services.length === 0) return <div className="empty-state">Đang tải dữ liệu...</div>;

    return (
        <div className="service-management-container">
            <div className="service-header" style={{ justifyContent: 'flex-end', display: 'flex' }}>
                {/* Đổi từ setShowModal(true) sang handleOpenCreate() */}
                <button className="btn-add-service" onClick={handleOpenCreate}>
                    + Add New Service
                </button>
            </div>

            <div className="service-data-card">
                <table className="service-table">
                    <thead>
                        <tr>
                            <th>Service Name</th>
                            <th>Price</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'left', paddingLeft: '30px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map((s) => (
                            <tr key={s._id} style={{ opacity: s.isActive ? 1 : 0.6 }}>
                                <td><span className="service-name">{s.name}</span></td>
                                <td>{s.price?.toLocaleString()} VNĐ</td>
                                <td>{s.duration} mins</td>
                                <td>
                                    <span className={`status-badge ${s.isActive ? 'status-active' : 'status-hidden'}`}>
                                        {s.isActive ? 'Active' : 'Hidden'}
                                    </span>
                                </td>
                                <td className="action-buttons">
                                    {/* Gọi hàm handleEdit truyền object s vào */}
                                    <button className="btn-edit" onClick={() => handleEdit(s)}>Edit</button>
                                    {s.isActive && (
                                        <button className="btn-delete" onClick={() => handleHide(s._id)}>Hide</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- MODAL DÙNG CHUNG (CREATE & UPDATE) --- */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            {/* Tiêu đề thay đổi linh hoạt */}
                            <h3>{editId ? 'Update Service' : 'Add New Service'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Service Name</label>
                                <input
                                    type="text" required
                                    placeholder='Ex: Haircut Deluxe'
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Price (VNĐ)</label>
                                    <input
                                        type="number" required
                                        min="1000"
                                        step="1000"
                                        placeholder='1000'
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Duration (mins)</label>
                                    <input
                                        type="number" required
                                        min="1"
                                        placeholder='1'
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    rows="3"
                                    placeholder='Service description...'
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                ></textarea>
                            </div>

                            {/* Nếu là Update, hiện thêm checkbox để kích hoạt lại dịch vụ nếu cần */}
                            {editId && (
                                <div className="status-selection-group">
                                    <label className="checkbox-container">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <span className="checkmark"></span>
                                        <span className={`status-text ${formData.isActive ? 'active' : 'hidden'}`}>
                                            {formData.isActive ? 'Active Service' : 'Service Hidden'}
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {editId ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ServiceManagement;