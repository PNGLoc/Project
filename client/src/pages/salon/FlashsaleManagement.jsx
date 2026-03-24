import React, { useState, useEffect, useMemo, useRef } from 'react';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';
import { FiEdit, FiSearch, FiFilter, FiChevronDown } from 'react-icons/fi';
import ConfirmModal from '../../components/ui/ConfirmModal';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../assets/css/SalonDashboard.css';
import '../../assets/css/FlashsaleManagement.css';

const FlashsaleManagement = () => {
    const [flashsales, setFlashsales] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterMenuRef = useRef(null);
    const [notification, setNotification] = useState(null);

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        pendingData: null,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const [formData, setFormData] = useState({
        id: null,
        name: '',
        description: '',
        startTime: '',
        endTime: '',
        services: []
    });

    useEffect(() => {
        fetchFlashsales();
        fetchServices();
    }, []);

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

    const fetchFlashsales = async () => {
        try {
            setLoading(true);
            const res = await axiosClient.get('/api/flashsales/owner');
            const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setFlashsales(data);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Could not load campaigns list.');
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const res = await axiosClient.get('/api/services/owner');
            const data = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setServices(data);
        } catch (error) {
            console.error('Error fetching services:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleServiceChange = (serviceId, field, value) => {
        const updatedServices = [...formData.services];
        const index = updatedServices.findIndex(s => s.serviceId === serviceId);

        if (index >= 0) {
            updatedServices[index][field] = value;
            setFormData({ ...formData, services: updatedServices });
        }
    };

    const toggleServiceSelection = (serviceId) => {
        const isSelected = formData.services.some(s => s.serviceId === serviceId);
        if (isSelected) {
            setFormData({
                ...formData,
                services: formData.services.filter(s => s.serviceId !== serviceId)
            });
        } else {
            setFormData({
                ...formData,
                services: [...formData.services, {
                    serviceId,
                    discountType: 'percentage',
                    discountValue: 0,
                    usageLimit: 1
                }]
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.services.length === 0) {
            return setNotification({ type: 'error', message: 'Please select at least one service.' });
        }

        try {
            const payload = {
                name: formData.name,
                description: formData.description,
                startTime: formData.startTime,
                endTime: formData.endTime,
                services: formData.services
            };

            if (formData.id) {
                await axiosClient.put(`/api/flashsales/${formData.id}`, payload);
                setNotification({ type: 'success', message: 'Campaign updated successfully!' });
            } else {
                await axiosClient.post('/api/flashsales', payload);
                setNotification({ type: 'success', message: 'Campaign created successfully!' });
            }
            setShowModal(false);
            fetchFlashsales();
            setTimeout(() => setNotification(null), 5000);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Unknown error occurred";
            setNotification({ type: 'error', message: 'Error: ' + errorMsg });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Campaign',
            message: 'Are you sure you want to delete this campaign? This action cannot be undone.',
            onConfirm: async () => {
                try {
                    await axiosClient.delete(`/api/flashsales/${id}`);
                    toast.success('Campaign deleted successfully!');
                    fetchFlashsales();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (error) {
                    const errorMsg = error.response?.data?.message || 'Delete failed';
                    toast.error('Could not delete campaign: ' + errorMsg);
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }
            }
        });
    };

    const openEditModal = (fs) => {
        const formatDateTime = (dateString) => {
            const date = new Date(dateString);
            return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

        setFormData({
            id: fs._id,
            name: fs.name,
            description: fs.description || '',
            startTime: formatDateTime(fs.startTime),
            endTime: formatDateTime(fs.endTime),
            services: fs.services.map(s => ({
                serviceId: s.serviceId._id || s.serviceId,
                discountType: s.discountType,
                discountValue: s.discountValue,
                usageLimit: s.usageLimit
            }))
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setFormData({
            id: null,
            name: '',
            description: '',
            startTime: '',
            endTime: '',
            services: []
        });
        setShowModal(true);
    };

    const filteredFlashsales = useMemo(() => {
        return flashsales.filter(fs => {
            const matchesSearch = fs.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || fs.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [flashsales, searchTerm, filterStatus]);

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case 'Active': return 'status-active';
            case 'Upcoming': return 'status-upcoming'; // added to custom css
            case 'Expired': return 'status-hidden'; // from SalonDashboard.css
            default: return '';
        }
    };

    if (loading && flashsales.length === 0) {
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
                <button className="btn-add-service" onClick={openCreateModal}>
                    + Add New Campaign
                </button>

                <div className="filter-dropdown-container" style={{ marginLeft: 'auto' }} ref={filterMenuRef}>
                    <button
                        className="btn-filter-calendar"
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                    >
                        <FiFilter size={16} />
                        <span>
                            {filterStatus === 'all' ? 'All Statuses' : filterStatus}
                        </span>
                        <FiChevronDown size={14} />
                    </button>

                    {showFilterMenu && (
                        <div className="filter-menu">
                            <div
                                className={`filter-menu-item ${filterStatus === 'all' ? 'selected' : ''}`}
                                onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }}
                            >
                                All Statuses
                            </div>
                            <div className="filter-divider"></div>
                            {['Active', 'Upcoming', 'Expired'].map(status => (
                                <div
                                    key={status}
                                    className={`filter-menu-item ${filterStatus === status ? 'selected' : ''}`}
                                    onClick={() => { setFilterStatus(status); setShowFilterMenu(false); }}
                                >
                                    {status}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="search-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', border: '1px solid #e2e8f0', padding: '8px 15px', borderRadius: '8px', minWidth: '250px' }}>
                    <FiSearch color="#64748b" />
                    <input
                        type="text"
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', width: '100%', background: 'transparent' }}
                    />
                </div>
            </div>

            <div className="service-data-card">
                {filteredFlashsales.length === 0 ? (
                    <div className="empty-state">
                        {searchTerm || filterStatus !== 'all' ? "No flashsales match your filters." : "There are no flashsales yet. Please create a new campaign."}
                    </div>
                ) : (
                    <table className="service-table">
                        <thead>
                            <tr>
                                <th>Campaign Name</th>
                                <th>Schedule</th>
                                <th>Total Services</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFlashsales.map(fs => (
                                <tr key={fs._id}>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span className="service-name">{fs.name}</span>
                                            <span style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>{fs.description}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ padding: '3px 8px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '6px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', width: '50px', textAlign: 'center' }}>START</span>
                                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                                                    {new Date(fs.startTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ padding: '3px 8px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px', width: '50px', textAlign: 'center' }}>END</span>
                                                <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: '500' }}>
                                                    {new Date(fs.endTime).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="category-tag">{fs.services.length} services</span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusBadgeClass(fs.status)}`}>
                                            {fs.status}
                                        </span>
                                    </td>
                                    <td className="actions-cell" style={{ textAlign: 'right' }}>
                                        <div className="action-buttons" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                            <button className="btn-edit-service" onClick={() => openEditModal(fs)}>
                                                <FiEdit size={18} color="#1e293b" style={{ marginRight: '5px' }} /> Edit
                                            </button>
                                            <button className="btn-hire-service" onClick={() => handleDelete(fs._id)}>
                                                Delete
                                            </button>
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
                    <div className="modal-content" style={{ overflow: 'visible' }}>
                        <div className="modal-header">
                            <h3>{formData.id ? 'Update Campaign' : 'Add New Campaign'}</h3>
                            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Campaign Name <span className="req">*</span></label>
                                <input type="text" name="name" required placeholder="e.g., Summer Sale" value={formData.name} onChange={handleInputChange} />
                            </div>

                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" rows="2" placeholder="Brief details about the campaign..." value={formData.description} onChange={handleInputChange} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}></textarea>
                            </div>

                            <div className="form-row" style={{ overflow: 'visible', position: 'relative', zIndex: 50 }}>
                                <div className="form-group" style={{ position: 'relative', zIndex: 20, flex: 1 }}>
                                    <label>Start Time <span className="req">*</span></label>
                                    <div style={{ width: '100%', display: 'flex' }}>
                                        <style>{`.react-datepicker-wrapper { width: 100%; }`}</style>
                                        <DatePicker
                                            selected={formData.startTime ? new Date(formData.startTime) : null}
                                            onChange={(date) => {
                                                if (date) {
                                                    const d = new Date(date);
                                                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                                                    setFormData({ ...formData, startTime: d.toISOString().slice(0, 16) });
                                                } else {
                                                    setFormData({ ...formData, startTime: '' });
                                                }
                                            }}
                                            showTimeSelect
                                            timeFormat="h:mm aa"
                                            timeIntervals={15}
                                            timeCaption="Time"
                                            dateFormat="MMMM d, yyyy h:mm aa"
                                            minDate={new Date()}
                                            customInput={<input style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} required />}
                                            placeholderText="Select start date & time"
                                        />
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Cannot select past dates.</p>
                                </div>
                                <div className="form-group" style={{ position: 'relative', zIndex: 10, flex: 1 }}>
                                    <label>End Time <span className="req">*</span></label>
                                    <div style={{ width: '100%', display: 'flex' }}>
                                        <DatePicker
                                            selected={formData.endTime ? new Date(formData.endTime) : null}
                                            onChange={(date) => {
                                                if (date) {
                                                    const d = new Date(date);
                                                    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                                                    setFormData({ ...formData, endTime: d.toISOString().slice(0, 16) });
                                                } else {
                                                    setFormData({ ...formData, endTime: '' });
                                                }
                                            }}
                                            showTimeSelect
                                            timeFormat="h:mm aa"
                                            timeIntervals={15}
                                            timeCaption="Time"
                                            dateFormat="MMMM d, yyyy h:mm aa"
                                            minDate={formData.startTime ? new Date(formData.startTime) : new Date()}
                                            customInput={<input style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} required />}
                                            placeholderText="Select end date & time"
                                        />
                                    </div>
                                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Must be after the start time.</p>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Select Participating Services <span className="req">*</span></label>
                                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>
                                    Check the services to include. For each, set either a percentage or fixed discount, and configure the maximum number of times this offer can be claimed (Usage Limit).
                                </p>
                                <div className="combo-selection-list">
                                    {services.map(service => {
                                        const isSelected = formData.services.some(s => s.serviceId === service._id);
                                        const serviceData = formData.services.find(s => s.serviceId === service._id);

                                        return (
                                            <div key={service._id} className="flashsale-service-item">
                                                <label className="combo-item-checkbox" style={{ marginBottom: isSelected ? '10px' : '0' }}>
                                                    <div className="checkbox-flex-container">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleServiceSelection(service._id)}
                                                        />
                                                        <span className="combo-item-name">{service.name}</span>
                                                        <span className="combo-item-price">{service.price.toLocaleString()} VND</span>
                                                    </div>
                                                </label>

                                                {isSelected && (
                                                    <div className="flashsale-discount-config">
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Discount Type</div>
                                                            <select
                                                                style={{ width: '100%' }}
                                                                value={serviceData.discountType}
                                                                onChange={(e) => handleServiceChange(service._id, 'discountType', e.target.value)}
                                                                title="Discount Type"
                                                            >
                                                                <option value="percentage">% Discount</option>
                                                                <option value="fixed">VND Discount</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Discount Value</div>
                                                            <input
                                                                style={{ width: '100%' }}
                                                                type="number"
                                                                placeholder="Amount"
                                                                title="Discount Value"
                                                                required
                                                                min="0"
                                                                value={serviceData.discountValue}
                                                                onChange={(e) => handleServiceChange(service._id, 'discountValue', Number(e.target.value))}
                                                            />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Usage Limit</div>
                                                            <input
                                                                style={{ width: '100%' }}
                                                                type="number"
                                                                placeholder="Max users"
                                                                title="Usage Limit (e.g. max 10 bookings)"
                                                                required
                                                                min="1"
                                                                value={serviceData.usageLimit}
                                                                onChange={(e) => handleServiceChange(service._id, 'usageLimit', Number(e.target.value))}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '20px' }}>
                                <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                                    {formData.id ? 'Save Changes' : 'Create Campaign'}
                                </button>
                            </div>
                        </form>
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
                type={confirmModal.title.includes('Delete') ? 'danger' : 'primary'}
            />
        </div>
    );
};

export default FlashsaleManagement;
