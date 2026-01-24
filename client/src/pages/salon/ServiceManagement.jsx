import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiEdit } from 'react-icons/fi';
import axiosClient from '../../lib/axios';
import '../../assets/css/SalonDashboard.css';

const ServiceManagement = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '', price: '', duration: '', description: '', isActive: true
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
            // axiosClient đã có base URL và tự động gán token
            const res = await axiosClient.get('/api/services/owner');
            setServices(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Lỗi tải danh sách:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const handleOpenCreate = () => {
        setEditId(null);
        setFormData({ name: '', price: '', duration: '', description: '', isActive: true });
        setShowModal(true);
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Kiểm tra tên không chứa số (Validation)
        if (/\d/.test(formData.name)) {
            alert("Servicename cannot contain numbers.");
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
                alert("Update successful!");
            } else {
                await axiosClient.post('/api/services/create', payload);
                alert("Creation successful!");
            }

            setShowModal(false);
            fetchServices();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Unknown error occurred";
            alert("Lỗi: " + errorMsg);
        }
    };

    const handleHide = async (id) => {
        if (window.confirm("Are you sure you want to hide this service?")) {
            try {
                await axiosClient.patch(`/api/services/${id}/hide`, {});
                fetchServices();
            } catch (error) {
                alert("Không thể ẩn dịch vụ: " + (error.response?.data?.message || error.message));
            }
        }
    };

    // Render loading state
    if (loading && services.length === 0) {
        return <div className="loading-container">Loading...</div>;
    }

    return (
        <div className="service-management-container">
            <div className="service-header">
                <button className="btn-add-service" onClick={handleOpenCreate}>
                    + Add New Service
                </button>
            </div>

            <div className="service-data-card">
                {services.length === 0 ? (
                    <div className="empty-state">There are no services yet. Please add a new service.</div>
                ) : (
                    <table className="service-table">
                        <thead>
                            <tr>
                                <th>Service Name</th>
                                <th>Price (VNĐ)</th>
                                <th>Duration</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((s) => (
                                <tr key={s._id} className={s.isActive ? '' : 'row-hidden'}>
                                    <td><span className="service-name">{s.name}</span></td>
                                    <td>{Number(s.price).toLocaleString()} VNĐ</td>
                                    <td>{s.duration} min</td>
                                    <td>
                                        <span className={`status-badge ${s.isActive ? 'status-active' : 'status-hidden'}`}>
                                            {s.isActive ? 'Pending' : 'Hidden'}
                                        </span>
                                    </td>
                                    <td className="action-buttons">
                                        <button className="btn-edit-service" onClick={() => handleEdit(s)}>
                                            <FiEdit size={18} color="#1e293b" style={{ marginRight: '5px' }} /> Edit
                                        </button>
                                        {s.isActive && (
                                            <button className="btn-hire-service" onClick={() => handleHide(s._id)}>Hire</button>
                                        )}
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
                                <label>Service Name</label>
                                <input
                                    type="text" required
                                    placeholder='e.g., Haircut'
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Price (VNĐ)</label>
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g., 100,000"
                                            /* Dùng Intl để ép định dạng 3 chữ số một dấu phẩy */
                                            value={formData.price ? new Intl.NumberFormat('en-US').format(formData.price) : ''}
                                            onChange={(e) => {
                                                // Chặn đứng các ký tự không phải số, chỉ lấy số thuần túy
                                                const rawValue = e.target.value.replace(/\D/g, "");
                                                setFormData({ ...formData, price: rawValue });
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Duration (minutes)</label>
                                    <input
                                        type="number" required min="1"
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
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {editId ? 'Save' : 'Create'}
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