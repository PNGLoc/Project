import React, { useEffect, useMemo, useState } from 'react';
import axiosClient from '../../lib/axios';
import '../../assets/css/PartnerDashboard.css';

const StaffDashboard = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const fetchMonthlyAppointments = async () => {
      try {
        setLoading(true);
        setError('');

        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const startDate = `${yyyy}-${mm}-01`;
        const endDate = `${yyyy}-${mm}-31`;

        // Reuse salon appointments API, scoped by month; backend scopes to salon/user
        const res = await axiosClient.get('/api/appointments/salon', {
          params: {
            startDate,
            endDate,
          },
        });

        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        // For staff role, backend already scopes to same salon, but may return all staff.
        // Filter client-side to keep only appointments assigned to current staff if possible.
        const currentStaffId = user?.staffId || user?.staff?._id || null;
        const filtered =
          currentStaffId
            ? list.filter((a) => String(a.staffId?._id || a.staffId) === String(currentStaffId))
            : list;

        setAppointments(filtered);
      } catch (e) {
        console.error('[STAFF DASHBOARD] fetch error', e);
        setError(e.response?.data?.message || 'Failed to load monthly appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlyAppointments();
  }, [user]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === 'PENDING').length;
    const confirmed = appointments.filter((a) => a.status === 'CONFIRMED').length;
    const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;

    const monthRevenue = appointments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((sum, a) => sum + (a.totalPrice || 0), 0);

    return {
      total,
      pending,
      confirmed,
      completed,
      cancelled,
      monthRevenue,
    };
  }, [appointments]);

  const formatVND = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  return (
    <div className="partner-dashboard">
      <div className="dashboard-wrapper">
        <div className="dashboard-header">
          <h1>Staff Dashboard</h1>
          <p>
            Welcome back{user?.fullName ? `, ${user.fullName}` : ''}! Here is your schedule and
            key stats for this month.
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '12px 16px',
              borderRadius: 12,
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Top stats */}
        <div className="stats-grid">
          <div className="dash-card">
            <div className="stat-header">
              <div className="stat-icon text-primary-svg">
                <span role="img" aria-label="calendar">
                  📅
                </span>
              </div>
              <span className="dash-badge badge-confirmed">
                {new Date().toLocaleDateString('vi-VN', {
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="stat-info">
              <p>Appointments This Month</p>
              <p className="stat-value">{stats.total}</p>
            </div>
          </div>

          <div className="dash-card">
            <div className="stat-header">
              <div className="stat-icon text-secondary-svg">
                <span role="img" aria-label="clock">
                  ⏱
                </span>
              </div>
              <span className="dash-badge badge-pending">Pending / Confirmed</span>
            </div>
            <div className="stat-info">
              <p>Upcoming (month)</p>
              <p className="stat-value">
                {stats.pending + stats.confirmed}
              </p>
            </div>
          </div>

          <div className="dash-card">
            <div className="stat-header">
              <div className="stat-icon text-accent-svg">
                <span role="img" aria-label="check">
                  ✅
                </span>
              </div>
              <span className="dash-badge badge-confirmed">Completed</span>
            </div>
            <div className="stat-info">
              <p>Finished This Month</p>
              <p className="stat-value">{stats.completed}</p>
            </div>
          </div>

          <div className="dash-card">
            <div className="stat-header">
              <div className="stat-icon text-primary-svg">
                <span role="img" aria-label="money">
                  💰
                </span>
              </div>
              <span className="dash-badge badge-confirmed">Today</span>
            </div>
            <div className="stat-info">
              <p>Revenue (this month)</p>
              <p className="stat-value">{formatVND(stats.monthRevenue)}</p>
            </div>
          </div>
        </div>

        {/* Schedule for today */}
        <div className="details-grid">
          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Today&apos;s Schedule</h3>
              <button
                type="button"
                className="dash-btn dash-btn-outline dash-btn-sm"
                onClick={() => window.location.reload()}
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>Loading appointments...</p>
            ) : appointments.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                You have no appointments scheduled for today.
              </p>
            ) : (
              <div className="schedule-list">
                {appointments.map((app) => (
                  <div key={app._id} className="schedule-item">
                    <div className="schedule-time">
                      <p>{formatTime(app.startAt)}</p>
                      <p>{formatDate(app.startAt)}</p>
                    </div>
                    <div className="schedule-details">
                      <div className="schedule-header">
                        <h4>{app.serviceSnapshot?.name || 'Service'}</h4>
                        <span
                          className="dash-badge"
                          style={{
                            backgroundColor:
                              app.status === 'COMPLETED'
                                ? '#dcfce7'
                                : app.status === 'CANCELLED'
                                ? '#fee2e2'
                                : app.status === 'CONFIRMED'
                                ? '#e0f2fe'
                                : '#fef9c3',
                            color:
                              app.status === 'COMPLETED'
                                ? '#166534'
                                : app.status === 'CANCELLED'
                                ? '#991b1b'
                                : '#075985',
                          }}
                        >
                          {app.status}
                        </span>
                      </div>
                      <p className="schedule-service">
                        {app.customerId?.fullName ||
                          app.guestInfo?.fullName ||
                          'Walk-in guest'}
                      </p>
                      <p className="schedule-stylist">
                        {formatVND(app.totalPrice)} •{' '}
                        {app.serviceSnapshot?.duration
                          ? `${app.serviceSnapshot.duration} mins`
                          : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h3 className="dash-card-title">Status Breakdown</h3>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Pending</span>
                <strong>{stats.pending}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Confirmed</span>
                <strong>{stats.confirmed}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Completed</span>
                <strong>{stats.completed}</strong>
              </li>
              <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span>Cancelled</span>
                <strong>{stats.cancelled}</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;

