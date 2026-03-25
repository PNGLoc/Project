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
  const [respondModal, setRespondModal] = useState({ open: false, report: null });
  const [respondText, setRespondText] = useState('');
  const [respondSaving, setRespondSaving] = useState(false);
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

  const openRespondModal = (report) => {
    setRespondModal({ open: true, report });
    setRespondText(String(report?.adminNote || ''));
  };

  const closeRespondModal = () => {
    if (respondSaving) return;
    setRespondModal({ open: false, report: null });
    setRespondText('');
  };

  const handleRespondSave = async () => {
    try {
      const reportId = respondModal?.report?._id;
      if (!reportId) return;

      const note = String(respondText || '').trim();
      if (!note) {
        showToast('error', 'Response message is required');
        return;
      }

      setRespondSaving(true);
      await axiosClient.patch(`/api/reports/${reportId}`, { adminNote: note });

      setReports((prev) => prev.map((r) => (r._id === reportId ? { ...r, adminNote: note } : r)));
      setSelected((prev) => (prev && prev._id === reportId ? { ...prev, adminNote: note } : prev));

      showToast('success', 'Response saved');
      closeRespondModal();
    } catch (error) {
      console.error('[ADMIN REPORTS] respond error', error);
      showToast('error', error.response?.data?.message || 'Failed to save response');
    } finally {
      setRespondSaving(false);
    }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleString('vi-VN') : '-';

  const getReporter = (r) => r?.createdBy || r?.userId || null;
  const getTarget = (r) => r?.targetUserId || (r?.type === 'SALON_COMPLAINT' ? r?.salonId : null);

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
  <col style={{ width: '18%' }} />
  <col style={{ width: '18%' }} />
  <col style={{ width: '22%' }} />
  <col style={{ width: '16%' }} />
  <col style={{ width: '12%' }} />
</colgroup>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Reporter</th>
                          <th>Target</th>
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
                            (() => {
                              const reporter = getReporter(r);
                              const target = getTarget(r);
                              const isResponded = Boolean(String(r?.adminNote || '').trim());
                              return (
                            <tr key={r._id}>
                              <td style={{ fontSize: 12, color: '#6b7280' }}>
                                {r._id.slice(-8)}
                                <br />
                                <span>{formatDate(r.createdAt)}</span>
                              </td>
                              <td>
                                {reporter?.fullName || '-'}
                                <br />
                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                  {reporter?.email}
                                </span>
                              </td>
                              <td>
                                {target?.fullName || target?.name || '-'}
                                {(target?.email || r.appointmentId?.serviceSnapshot?.name) && (
                                  <>
                                    <br />
                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                      {target?.email || r.appointmentId?.serviceSnapshot?.name}
                                    </span>
                                  </>
                                )}
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
                                <label className={`status-toggle ${updatingId === r._id ? 'disabled' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={r.status === 'RESOLVED'}
                                    disabled={updatingId === r._id || r.status === 'RESOLVED'}
                                    onChange={(e) =>
                                      handleChangeStatus(r._id, e.target.checked ? 'RESOLVED' : 'PENDING')
                                    }
                                  />
                                  <span className="track" aria-hidden="true" />
                                  <span className="status-text">
                                    {r.status === 'RESOLVED' ? 'Resolved' : 'Pending'}
                                  </span>
                                </label>
                              </td>
                              <td>
                                <div
                                  className="action-group"
                                  style={{ justifyContent: 'flex-end', gap: 8 }}
                                >
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => setSelected(r)}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className={`btn-approve-teal ${isResponded ? 'btn-responded' : ''}`}
                                    onClick={() => openRespondModal(r)}
                                    disabled={isResponded}
                                    title={isResponded ? 'Already responded' : 'Respond to this report'}
                                  >
                                    {isResponded ? 'Responded' : 'Respond'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                              );
                            })()
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
                      <span className="label">Reporter</span>
                      <span className="value">
                        {(getReporter(selected)?.fullName || '-')}{' '}
                        {getReporter(selected)?.email ? `(${getReporter(selected)?.email})` : ''}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Target</span>
                      <span className="value">
                        {selected.targetUserId?.fullName
                          ? `${selected.targetUserId.fullName}${selected.targetUserId.email ? ` (${selected.targetUserId.email})` : ''}`
                          : selected.type === 'SALON_COMPLAINT'
                            ? (selected.salonId?.name || '-')
                            : '-'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Status</span>
                      <span className="value" style={{ textTransform: 'capitalize' }}>
                        {selected.status.toLowerCase()}
                      </span>
                    </div>
                    {selected.reason && (
                      <div className="detail-row">
                        <span className="label">Reason</span>
                        <span className="value">{selected.reason}</span>
                      </div>
                    )}
                    {selected.appointmentId && (
                      <div className="detail-row">
                        <span className="label">Booking</span>
                        <span className="value">
                          {selected.appointmentId?.serviceSnapshot?.name || 'Appointment'}{' '}
                          {selected.appointmentId?.startAt ? `- ${formatDate(selected.appointmentId.startAt)}` : ''}
                        </span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Created at</span>
                      <span className="value">{formatDate(selected.createdAt)}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Description</span>
                      <span className="value">{selected.description || '-'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Admin response</span>
                      <span className="value">{selected.adminNote || '-'}</span>
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

            {respondModal.open && (
              <div className="admin-modal-backdrop" onClick={closeRespondModal}>
                <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal-header">
                    <h3>Respond to report</h3>
                    <button
                      type="button"
                      className="admin-modal-close"
                      onClick={closeRespondModal}
                      disabled={respondSaving}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      Reporter: <b>{getReporter(respondModal.report)?.fullName || '-'}</b>{' '}
                      {getReporter(respondModal.report)?.email ? `(${getReporter(respondModal.report)?.email})` : ''}
                      <br />
                      Target: <b>{getTarget(respondModal.report)?.fullName || getTarget(respondModal.report)?.name || '-'}</b>
                    </div>

                    <div style={{ display: 'grid', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>Message *</label>
                      <textarea
                        value={respondText}
                        onChange={(e) => setRespondText(e.target.value)}
                        rows={5}
                        placeholder="Type your response..."
                        style={{
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #e5e7eb',
                          resize: 'vertical',
                          fontSize: 14,
                        }}
                        disabled={respondSaving}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={closeRespondModal}
                        disabled={respondSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-approve-teal"
                        onClick={handleRespondSave}
                        disabled={respondSaving}
                      >
                        {respondSaving ? 'Saving...' : 'OK'}
                      </button>
                    </div>
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