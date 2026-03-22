import { useEffect, useState } from 'react';
import AdminHeader from '../../components/admin/AdminHeader';
import axiosClient from '../../lib/axios';

import '../../assets/css/AdminReports.css';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'RESOLVED'];

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [toast, setToast] = useState({ type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    if (message) {
      setTimeout(() => setToast({ type: '', message: '' }), 3000);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await axiosClient.get('/api/reports', { params });
      setReports(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error('[ADMIN REPORTS] fetch error', error);
      showToast('error', error.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleChangeStatus = async (reportId, nextStatus) => {
    try {
      setUpdatingId(reportId);
      await axiosClient.patch(`/api/reports/${reportId}`, { status: nextStatus });
      setReports((prev) =>
        prev.map((r) => (r._id === reportId ? { ...r, status: nextStatus } : r))
      );
      showToast('success', 'Report updated');
    } catch (error) {
      console.error('[ADMIN REPORTS] update error', error);
      showToast('error', error.response?.data?.message || 'Failed to update report');
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('vi-VN') : '-';

  return (
    <div className="admin-wrapper">
      {toast.message && (
        <div className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}

      <AdminHeader />

      <main className="admin-content-full">
        <div className="page-inner">
          <div className="dynamic-header">
            <h1>Report Management</h1>
            <p>View and handle user reports about salons</p>
          </div>

          <div className="section-divider" />

          {/* Wrapper scope CSS cho trang Reports */}
          <div className="reports-page">
            <div className="admin-users-center">
              <div className="admin-card users-card">
                <div className="table-header-row">
                  <h3>Reports</h3>
                  <span className="count-badge">{reports.length} Reports</span>
                </div>

                <div
                  className="filters-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Manage complaints users submit about salons.
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 14,
                      backgroundColor: 'white',
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s === 'ALL' ? 'All status' : s}
                      </option>
                    ))}
                  </select>
                </div>

                {loading ? (
                  <div className="loading-state">Loading reports...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table users-table">
                 <colgroup>
  <col style={{ width: '14%' }} />   {/* ID - giảm từ 15% */}
  <col style={{ width: '19%' }} />   {/* Salon - giảm từ 20% */}
  <col style={{ width: '19%' }} />   {/* User - giảm từ 20% */}
  <col style={{ width: '20%' }} />   {/* Description - giảm từ 25% */}
  <col style={{ width: '15%' }} />   {/* Status - tăng nhẹ */}
  <col style={{ width: '13%' }} />   {/* Actions - tăng nhẹ */}
</colgroup>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Salon</th>
                          <th>User</th>
                          <th>Description</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reports.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="no-data-cell">
                              No reports found.
                            </td>
                          </tr>
                        ) : (
                          reports.map((r) => (
                            <tr key={r._id}>
                              <td style={{ fontSize: 12, color: '#6b7280' }}>
                                {r._id.slice(-8)}
                                <br />
                                <span>{formatDate(r.createdAt)}</span>
                              </td>
                              <td>{r.salonId?.name || '-'}</td>
                              <td>
                                {r.userId?.fullName || '-'}
                                <br />
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                  {r.userId?.email}
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    maxWidth: 280,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {r.description}
                                </span>
                              </td>
                              <td>
                                <span className="status-active-pill" style={{ textTransform: 'capitalize' }}>
                                  {r.status.toLowerCase()}
                                </span>
                              </td>
                              <td>
                                <div
                                  className="action-group"
                                  style={{ justifyContent: 'flex-end', gap: 8 }}
                                >
                                  {r.status !== 'RESOLVED' && (
                                    <button
                                      type="button"
                                      className="btn-approve-teal"
                                      disabled={updatingId === r._id}
                                      onClick={() => handleChangeStatus(r._id, 'RESOLVED')}
                                    >
                                      {updatingId === r._id ? 'Updating...' : 'Resolved'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => setSelected(r)}
                                  >
                                    View
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div
                className="admin-modal-backdrop"
                onClick={() => setSelected(null)}
              >
                <div
                  className="admin-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="admin-modal-header">
                    <h3>Report detail</h3>
                    <button
                      type="button"
                      className="admin-modal-close"
                      onClick={() => setSelected(null)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="detail-grid">
                    <div className="detail-row">
                      <span className="label">Salon</span>
                      <span className="value">{selected.salonId?.name || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">User</span>
                      <span className="value">
                        {selected.userId?.fullName} ({selected.userId?.email})
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status</span>
                      <span className="value" style={{ textTransform: 'capitalize' }}>
                        {selected.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Created at</span>
                      <span className="value">{formatDate(selected.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Description</span>
                      <span className="value">{selected.description || '-'}</span>
                    </div>
                    {selected.evidenceUrls && selected.evidenceUrls.length > 0 && (
                      <div className="detail-row">
                        <span className="label">Evidence</span>
                        <span className="value">
                          {selected.evidenceUrls.map((u) => (
                            <div key={u}>
                              <a href={u} target="_blank" rel="noreferrer">
                                {u}
                              </a>
                            </div>
                          ))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminReports;