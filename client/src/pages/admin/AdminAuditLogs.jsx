import { useEffect, useState } from 'react';
import AdminHeader from '../../components/admin/AdminHeader';
import adminApi from '../../features/admin/api/adminApi';
import '../../assets/css/AdminDashboard.css';

const PAGE_SIZE = 15;

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [actions, setActions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: PAGE_SIZE });

    const [actionFilter, setActionFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [ipFilter, setIpFilter] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const fetchLogs = async (page = 1) => {
        try {
            setLoading(true);
            setError('');

            const params = {
                page,
                limit: PAGE_SIZE,
                action: actionFilter || undefined,
                user: userFilter || undefined,
                ip: ipFilter || undefined,
                startTime: startTime ? new Date(startTime).toISOString() : undefined,
                endTime: endTime ? new Date(endTime).toISOString() : undefined
            };

            const res = await adminApi.getAuditLogs(params);
            setLogs(res?.data || []);
            setPagination(res?.pagination || { page: 1, pages: 1, total: 0, limit: PAGE_SIZE });
            setActions(res?.filters?.actions || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load audit logs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs(1);
    }, []);

    const handleApplyFilters = () => {
        fetchLogs(1);
    };

    const handleResetFilters = () => {
        setActionFilter('');
        setUserFilter('');
        setIpFilter('');
        setStartTime('');
        setEndTime('');

        setTimeout(() => {
            fetchLogs(1);
        }, 0);
    };

    return (
        <div className="admin-wrapper">
            <AdminHeader />

            <main className="admin-content-full">
                <div className="page-inner">
                    <div className="dynamic-header">
                        <h1>Audit Logs</h1>
                        <p>Trace sensitive actions across the platform</p>
                    </div>

                    <div className="section-divider" />

                    <div className="admin-card users-card">
                        <div className="table-header-row">
                            <h3>Security Logs</h3>
                            <span className="count-badge">{pagination.total || 0} entries</span>
                        </div>

                        <div
                            className="filters-row"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: '10px',
                                marginBottom: '16px'
                            }}
                        >
                            <select
                                className="profile-form-control"
                                value={actionFilter}
                                onChange={(e) => setActionFilter(e.target.value)}
                            >
                                <option value="">All actions</option>
                                {actions.map((action) => (
                                    <option key={action} value={action}>{action}</option>
                                ))}
                            </select>

                            <input
                                className="profile-form-control"
                                type="text"
                                placeholder="User ID / name / email"
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                            />

                            <input
                                className="profile-form-control"
                                type="text"
                                placeholder="IP address"
                                value={ipFilter}
                                onChange={(e) => setIpFilter(e.target.value)}
                            />

                            <input
                                className="profile-form-control"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />

                            <input
                                className="profile-form-control"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <button type="button" className="btn-approve-teal" onClick={handleApplyFilters}>Apply</button>
                            <button type="button" className="btn-outline" onClick={handleResetFilters}>Reset</button>
                        </div>

                        {error && (
                            <div style={{ background: '#fee2e2', color: '#b91c1c', padding: 10, borderRadius: 8, marginBottom: 12 }}>
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="loading-state">Loading audit logs...</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="admin-table users-table">
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>Action</th>
                                            <th>User</th>
                                            <th>IP</th>
                                            <th>User-Agent</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="no-data-cell">No audit logs found.</td>
                                            </tr>
                                        ) : logs.map((log) => (
                                            <tr key={log._id}>
                                                <td>{log.createdAt ? new Date(log.createdAt).toLocaleString('vi-VN') : '-'}</td>
                                                <td>{log.action || '-'}</td>
                                                <td>
                                                    {log.userId?.fullName || '-'}
                                                    <br />
                                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                        {log.userId?.email || log.userId?._id || 'Anonymous'}
                                                    </span>
                                                </td>
                                                <td>{log.ip || '-'}</td>
                                                <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.userAgent || '-'}
                                                </td>
                                                <td>{log.statusCode || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="admin-pagination" style={{ marginTop: 16 }}>
                            <button
                                type="button"
                                className="btn-outline"
                                disabled={pagination.page <= 1 || loading}
                                onClick={() => fetchLogs(pagination.page - 1)}
                            >
                                Prev
                            </button>
                            <span style={{ padding: '0 12px', fontSize: 14 }}>
                                Page {pagination.page || 1} / {pagination.pages || 1}
                            </span>
                            <button
                                type="button"
                                className="btn-outline"
                                disabled={pagination.page >= pagination.pages || loading}
                                onClick={() => fetchLogs(pagination.page + 1)}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminAuditLogs;
