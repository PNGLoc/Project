import { useEffect, useState } from 'react';
import axiosClient from '../../lib/axios';
import '../../assets/css/AdminReports.css';

const STATUS_OPTIONS = ['ALL', 'PENDING', 'RESOLVED'];

const SalonReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });

  const showToast = (type, message) => {
    setToast({ type, message });
    if (message) {
      setTimeout(() => setToast({ type: '', message: '' }), 3000);
    }
  };

  const formatDate = (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await axiosClient.get('/api/reports/provider/mine', { params });
      setReports(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error('[SALON REPORTS] fetch error', error);
      showToast('error', error.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const openDetail = async (r) => {
    try {
      setDetailLoading(true);
      const res = await axiosClient.get(`/api/reports/provider/${r._id}`);
      setSelected(res.data?.data || r);
    } catch (error) {
      console.error('[SALON REPORTS] detail error', error);
      showToast('error', error.response?.data?.message || 'Failed to load report detail');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {toast.message && (
        <div className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}

      <div className="reports-page" style={{ marginTop: 8 }}>
        <div className="admin-users-center">
          <div className="admin-card users-card">
            <div className="table-header-row">
              <h3>My Reports</h3>
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
                flexWrap: 'wrap'
              }}
            >
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                Reports you have submitted about customers.
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  fontSize: 14,
                  backgroundColor: 'white'
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'ALL' ? 'All status' : s === 'PENDING' ? 'Pending' : 'Resolved'}
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
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Booking</th>
                      <th>Customer</th>
                      <th>Reason</th>
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
                          <td>
                            <div style={{ fontWeight: 600 }}>
                              {r.appointmentId?.serviceSnapshot?.name || 'Booking'}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {r.appointmentId?.startAt ? formatDate(r.appointmentId.startAt) : '-'}
                            </div>
                          </td>
                          <td>
                            {r.targetUserId?.fullName || '-'}
                            <br />
                            <span style={{ fontSize: 12, color: '#6b7280' }}>
                              {r.targetUserId?.email || r.targetUserId?.phone || ''}
                            </span>
                          </td>
                          <td>{r.reason || '-'}</td>
                          <td>
                            <span className={`status-pill status-${String(r.status || '').toLowerCase()}`}>
                              {r.status === 'PENDING' ? 'Pending' : 'Resolved'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => openDetail(r)}
                            >
                              View
                            </button>
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

        {(selected || detailLoading) && (
          <div className="admin-modal-backdrop" onClick={() => setSelected(null)}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <h3>Report detail</h3>
                <button type="button" className="admin-modal-close" onClick={() => setSelected(null)}>
                  ✕
                </button>
              </div>

              {detailLoading && !selected ? (
                <div className="loading-state">Loading detail...</div>
              ) : (
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="label">Customer</span>
                    <span className="value">
                      {selected?.targetUserId?.fullName || '-'}{' '}
                      {selected?.targetUserId?.email ? `(${selected.targetUserId.email})` : ''}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Booking</span>
                    <span className="value">
                      {selected?.appointmentId?.serviceSnapshot?.name || 'Booking'}{' '}
                      {selected?.appointmentId?.startAt ? `- ${formatDate(selected.appointmentId.startAt)}` : ''}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status</span>
                    <span className="value" style={{ textTransform: 'capitalize' }}>
                      {String(selected?.status || '').toLowerCase() || '-'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Reason</span>
                    <span className="value">{selected?.reason || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Created at</span>
                    <span className="value">{formatDate(selected?.createdAt)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Description</span>
                    <span className="value">{selected?.description || '-'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Admin response</span>
                    <span className="value">{selected?.adminNote || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalonReports;

