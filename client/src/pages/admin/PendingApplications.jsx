import { useState, useEffect } from 'react';
import axios from 'axios';
import { TfiCheck } from "react-icons/tfi";
import { TfiClose } from "react-icons/tfi";
import { toast } from 'react-toastify';
import ConfirmModal from '../../components/ui/ConfirmModal';
import '../../assets/css/AdminDashboard.css';

const PendingApplications = () => {
    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);

    const timeAgo = (date) => {
        const s = Math.floor((Date.now() - new Date(date)) / 1000);
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)} min ago`;
        if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) > 1 ? 's' : ''} ago`;
        const days = Math.floor(s / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    };

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        showInput: false,
        onConfirm: () => { }
    });
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchSalons();
    }, []);

    const fetchSalons = async () => {
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = localStorage.getItem('token');

            if (!token) {
                setLoading(false);
                return;
            }

            const res = await axios.get('http://127.0.0.1:5000/api/salons/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSalons(res.data);
        } catch (error) {
            console.error("Error fetching list:", error);
            if (error.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                window.location.href = '/login';
            }
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = (id) => {
        const token = localStorage.getItem('token');
        if (!token) { toast.error("Please login again!"); return; }

        setConfirmModal({
            isOpen: true,
            title: 'Approve Salon',
            message: 'Are you sure you want to approve this Salon application?',
            onConfirm: async () => {
                setProcessingId(id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await axios.patch(`http://127.0.0.1:5000/api/salons/approve/${id}`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    toast.success("Approved successfully!");
                    setSalons(prevSalons => prevSalons.filter(salon => salon._id !== id));
                } catch (error) {
                    toast.error("Approval error: " + (error.response?.data?.message || error.message));
                    fetchSalons();
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const handleReject = (id) => {
        const token = localStorage.getItem('token');
        if (!token) { toast.error("Please login again!"); return; }

        setConfirmModal({
            isOpen: true,
            title: 'Reject Application',
            message: 'Please provide a reason for rejecting this application:',
            showInput: true,
            onConfirm: async (reason) => {
                setProcessingId(id);
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                try {
                    await axios.delete(`http://127.0.0.1:5000/api/salons/reject/${id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                        data: { reason }
                    });
                    toast.success("Application rejected!");
                    setSalons(prevSalons => prevSalons.filter(salon => salon._id !== id));
                } catch (error) {
                    toast.error("Rejection error: " + (error.response?.data?.message || error.message));
                } finally {
                    setProcessingId(null);
                }
            }
        });
    };

    const formatAddress = (addr) => {
        if (!addr) return 'N/A';
        if (typeof addr === 'object') {
            // Nối Street, District, City và lọc bỏ các giá trị null/undefined
            const parts = [addr.street, addr.district, addr.city];
            const fullAddr = parts.filter(part => part && part.trim() !== '').join(', ');
            return fullAddr || 'N/A';
        }
        return addr;
    };

    if (loading) return <div className="loading-state">Loading data...</div>;

    return (
        <div className="pending-card-container">
            {/* Header của phần bảng */}
            <div className="table-header-row">
                <h3>Pending Salon Approvals</h3>
                <span className="status-pending-pill">{salons.length} Pending</span>
            </div>

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th className="text-center">Image</th>
                            <th>Salon Name</th>
                            <th>Owner / ID</th>
                            <th>Email</th>
                            <th className="text-center">License</th>
                            <th>Location</th>
                            <th className="text-center">Submitted</th>
                            <th className="text-center">Status</th>
                            <th className="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salons.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="no-data-cell">No pending applications found.</td>
                            </tr>
                        ) : (
                            salons.map(salon => (
                                <tr key={salon._id}>
                                    <td className="text-center">
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            {salon.images?.[0] ? (
                                                <img 
                                                    src={`http://127.0.0.1:5000${salon.images[0]}`} 
                                                    alt="Salon" 
                                                    className="admin-table-img"
                                                    onClick={() => window.open(`http://127.0.0.1:5000${salon.images[0]}`, '_blank')}
                                                />
                                            ) : (
                                                <div className="no-image-placeholder">No Image</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="font-semibold">{salon.name}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{salon.ownerId?.fullName || 'N/A'}</span>
                                            <span style={{ fontSize: '11px', color: '#6b7280' }}>ID: {salon.ownerIdNumber || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: '#0d9488', fontSize: 13 }}>{salon.ownerId?.email || 'N/A'}</td>
                                    <td className="text-center">
                                        {salon.businessLicenseImage ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                                                <img 
                                                    src={`http://127.0.0.1:5000${salon.businessLicenseImage}`} 
                                                    alt="License" 
                                                    className="admin-table-img"
                                                    onClick={() => window.open(`http://127.0.0.1:5000${salon.businessLicenseImage}`, '_blank')}
                                                />
                                                <span 
                                                    className="license-pill"
                                                    onClick={() => window.open(`http://127.0.0.1:5000${salon.businessLicenseImage}`, '_blank')}
                                                >
                                                    View License
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ color: '#9ca3af', fontSize: '12px' }}>No License</span>
                                        )}
                                    </td>
                                    <td>{formatAddress(salon.address)}</td>
                                    <td className="text-center text-gray">{timeAgo(salon.createdAt)}</td>
                                    <td className="text-center">
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <span className="status-pending-pill">Pending</span>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="action-group" style={{ justifyContent: 'center' }}>
                                            <button
                                                className="btn-approve-teal"
                                                onClick={() => handleApprove(salon._id)}
                                                disabled={processingId === salon._id}
                                                title="Approve"
                                            >
                                                {processingId === salon._id ? (
                                                    <span className="loader-spinner"></span>
                                                ) : (
                                                    <TfiCheck size={22} strokeWidth={0.5} />
                                                )}
                                            </button>
                                            <button
                                                className="btn-reject-rose"
                                                onClick={() => handleReject(salon._id)}
                                                disabled={processingId === salon._id}
                                                title="Reject"
                                            >
                                                {processingId === salon._id ? (
                                                    <span className="loader-spinner"></span>
                                                ) : (
                                                    <TfiClose size={22} strokeWidth={0.5} />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                showInput={confirmModal.showInput}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                confirmText={confirmModal.title.includes('Reject') ? 'Reject' : 'Approve'}
                type={confirmModal.title.includes('Reject') ? 'danger' : 'primary'}
                isRequired={confirmModal.showInput}
            />
        </div>
    );
};

export default PendingApplications;