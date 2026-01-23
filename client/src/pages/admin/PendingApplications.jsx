import { useState, useEffect } from 'react';
import axios from 'axios';
import { TfiCheck } from "react-icons/tfi";
import { TfiClose } from "react-icons/tfi";

const PendingApplications = () => {
    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchSalons();
    }, []);

    const fetchSalons = async () => {
        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;
            const token = user?.token;

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
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Are you sure you want to approve this Salon?")) return;
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const token = user?.token;

        if (!token) { alert("Please login again!"); return; }
        setProcessingId(id);

        try {
            await axios.patch(`http://127.0.0.1:5000/api/salons/approve/${id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Approved successfully!");
            setSalons(prevSalons => prevSalons.filter(salon => salon._id !== id));
        } catch (error) {
            alert("Approval error: " + (error.response?.data?.message || error.message));
            fetchSalons();
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id) => {
        if (!window.confirm("This action will permanently delete the application. Continue?")) return;
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const token = user?.token;

        if (!token) { alert("Please login again!"); return; }
        setProcessingId(id);

        try {
            await axios.delete(`http://127.0.0.1:5000/api/salons/reject/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Application rejected!");
            setSalons(prevSalons => prevSalons.filter(salon => salon._id !== id));
        } catch (error) {
            alert("Rejection error: " + (error.response?.data?.message || error.message));
        } finally {
            setProcessingId(null);
        }
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
                <span className="count-badge">{salons.length} Pending</span>
            </div>

            <div className="table-responsive">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Salon Name</th>
                            <th>Owner</th>
                            <th>Location</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {salons.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="no-data-cell">No pending applications found.</td>
                            </tr>
                        ) : (
                            salons.map(salon => (
                                <tr key={salon._id}>
                                    <td className="font-semibold">{salon.name}</td>
                                    <td>{salon.ownerId?.fullName || 'N/A'}</td>
                                    <td>{formatAddress(salon.address)}</td>
                                    <td className="text-gray">{new Date(salon.createdAt).toLocaleDateString()}</td>
                                    <td><span className="status-pending-pill">Pending</span></td>
                                    <td>
                                        <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn-approve-teal"
                                                onClick={() => handleApprove(salon._id)}
                                                disabled={processingId === salon._id}
                                            >
                                                {processingId === salon._id ? (
                                                    <span className="loader-spinner"></span>
                                                ) : (
                                                    <>
                                                        <TfiCheck
                                                            size={18} /> Approve
                                                    </>
                                                )}
                                            </button>
                                            <button
                                                className="btn-reject-rose"
                                                onClick={() => handleReject(salon._id)}
                                                disabled={processingId === salon._id}
                                            >
                                                {processingId === salon._id ? (
                                                    <span className="loader-spinner"></span>
                                                ) : (
                                                    <>
                                                        <TfiClose size={18} /> Reject
                                                    </>
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
        </div>
    );
};

export default PendingApplications;