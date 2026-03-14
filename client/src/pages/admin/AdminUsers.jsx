import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi';
import userAdminApi from '../../features/admin/api/userAdminApi';
import { useLogout } from '../../features/auth/hooks/useLogout';
import '../../assets/css/AdminDashboard.css';

const AdminUsers = () => {
  const [users, setUsers] = useState([]); // all users from API (unfiltered)
  const [pagination, setPagination] = useState({ page: 1, limit: 8, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [detailUser, setDetailUser] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [confirmUser, setConfirmUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { logout } = useLogout();
  const user = JSON.parse(localStorage.getItem('user'));
  const location = useLocation();
  const isOverview = location.pathname === '/admin/dashboard';
  const isMyPosts = location.pathname === '/admin/my-posts';
  const isUsers = location.pathname === '/admin/users';
  const isReports = location.pathname === '/admin/reports';

  const PAGE_SIZE = 8;

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Lấy nhiều user một lần, phân trang & lọc ở client
      const data = await userAdminApi.getUsers({ page: 1, limit: 1000 });
      const list = data.users || [];
      setUsers(list);
      setPagination({
        page: 1,
        limit: PAGE_SIZE,
        pages: Math.max(1, Math.ceil(list.length / PAGE_SIZE)),
        total: list.length,
      });
    } catch (error) {
      console.error('[ADMIN USERS] fetch error', error);
      showToast('error', error.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChangePage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    setPagination((prev) => ({
      ...prev,
      page: nextPage,
    }));
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    if (message) {
      setTimeout(() => {
        setToast({ type: '', message: '' });
      }, 3000);
    }
  };

  const handleViewDetail = async (userId) => {
    try {
      const data = await userAdminApi.getUserById(userId);
      setDetailUser(data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('[ADMIN USERS] get detail error', error);
      showToast('error', error.response?.data?.message || 'Failed to load user detail');
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      setProcessingId(userId);
      const res = await userAdminApi.toggleUserActive(userId);
      const updated = res.user;
      setUsers((prev) =>
        prev.map((u) => (u._id === updated._id ? { ...u, isActive: updated.isActive } : u))
      );
      showToast('success', res.message || 'Status updated');
    } catch (error) {
      console.error('[ADMIN USERS] toggle error', error);
      showToast('error', error.response?.data?.message || 'Failed to update user status');
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirm = (user) => {
    setConfirmUser(user);
  };

  const closeConfirm = () => {
    setConfirmUser(null);
  };

  const statusPillClass = (isActive) =>
    isActive ? 'status-active-pill' : 'status-banned-pill';

  // Lọc theo search + role + status trên toàn bộ danh sách
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !normalizedSearch ||
      (u.fullName && u.fullName.toLowerCase().includes(normalizedSearch)) ||
      (u.email && u.email.toLowerCase().includes(normalizedSearch));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'BANNED' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Tính lại pagination dựa trên danh sách đã lọc
  const totalFiltered = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  const currentPage = Math.min(pagination.page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);

  const displayedPagination = {
    page: currentPage,
    pages: totalPages,
    total: totalFiltered,
  };

  return (
    <div className="admin-wrapper">
      {toast.message && (
        <div className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}
      {/* Shared admin header */}
      <header className="admin-header">
        <div className="header-container">
          <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
            <div className="logo-section">
              <HiSparkles size={24} color="#0d9488" />
              <span>SalonHub</span>
            </div>

            <nav className="header-nav">
              <Link className={`nav-link ${isOverview ? 'active' : ''}`} to="/admin/dashboard">
                Overview
              </Link>
              <Link className={`nav-link ${isMyPosts ? 'active' : ''}`} to="/admin/my-posts">
                My Posts
              </Link>
              <Link className={`nav-link ${isUsers ? 'active' : ''}`} to="/admin/users">
                Users
              </Link>
              <Link className={`nav-link ${isReports ? 'active' : ''}`} to="/admin/reports">
                Reports
              </Link>
            </nav>
          </div>

          <div className="header-right">
            <div className="user-controls">
              <button className="btn-sign-in">{user?.fullName || 'Admin'}</button>
              <button className="btn-get-started" onClick={logout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="admin-content-full">
        <div className="page-inner">
          <div className="dynamic-header">
            <h1>User Management</h1>
            <p>View, inspect and manage all registered users in the system</p>
          </div>

          <div className="section-divider" />

          <div className="admin-users-center">
            <div className="admin-card users-card">
              <div className="table-header-row">
                <h3>Users</h3>
                <span className="count-badge">{displayedPagination.total} users</span>
              </div>

              <div
                className="filters-row"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '16px',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <input
                  type="text"
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchTerm(value);
                    // luôn quay về trang 1 khi search
                    fetchUsers(1, { searchTerm: value });
                  }}
                  style={{
                    flex: '1 1 220px',
                    minWidth: '200px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px',
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <select
                    value={roleFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      setRoleFilter(value);
                      fetchUsers(1, { roleFilter: value });
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="ALL">All roles</option>
                    <option value="CUSTOMER">Customer</option>
                    <option value="SALON_OWNER">Salon owner</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStatusFilter(value);
                      fetchUsers(1, { statusFilter: value });
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="ALL">All status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="BANNED">Banned</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">Loading users...</div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table users-table">
                    <colgroup>
                      <col style={{ width: '24%' }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '13%' }} />
                      <col style={{ width: '8%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="no-data-cell">
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map((u) => (
                          <tr key={u._id}>
                            <td className="font-semibold">{u.fullName}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                            <td>
                              <span className={statusPillClass(u.isActive)}>
                                {u.isActive ? 'Active' : 'Banned'}
                              </span>
                            </td>
                            <td className="text-gray">
                              {u.createdAt
                                ? new Date(u.createdAt).toLocaleDateString()
                                : '-'}
                            </td>
                            <td>
                              <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                                <button
                                  type="button"
                                  className="btn-outline"
                                  onClick={() => handleViewDetail(u._id)}
                                >
                                  View
                                </button>
                                <button
                                  type="button"
                                  className={u.isActive ? 'btn-reject-rose' : 'btn-approve-teal'}
                                  onClick={() => openConfirm(u)}
                                  disabled={processingId === u._id}
                                >
                                  {processingId === u._id
                                    ? 'Processing...'
                                    : u.isActive
                                    ? 'Ban'
                                    : 'Unban'}
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

              {/* Pagination */}
              <div className="pagination-row">
                <button
                  type="button"
                  className="btn-outline"
                  disabled={displayedPagination.page <= 1}
                  onClick={() => handleChangePage(displayedPagination.page - 1)}
                >
                  Previous
                </button>
                <span className="pagination-info">
                  Page {displayedPagination.page} / {displayedPagination.pages || 1}
                </span>
                <button
                  type="button"
                  className="btn-outline"
                  disabled={displayedPagination.page >= displayedPagination.pages}
                  onClick={() => handleChangePage(displayedPagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {isDetailOpen && detailUser && (
            <div className="admin-modal-backdrop" onClick={() => setIsDetailOpen(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>User detail</h3>
                  <button
                    type="button"
                    className="admin-modal-close"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    ✕
                  </button>
                </div>
                <div className="detail-grid">
                  <div className="detail-row">
                    <span className="label">Full name</span>
                    <span className="value">{detailUser.fullName}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email</span>
                    <span className="value">{detailUser.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Phone</span>
                    <span className="value">{detailUser.phone || 'Not set'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Role</span>
                    <span className="value">{detailUser.role}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status</span>
                    <span className={statusPillClass(detailUser.isActive)}>
                      {detailUser.isActive ? 'Active' : 'Banned'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Verified</span>
                    <span className="value">{detailUser.isVerified ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Wallet balance</span>
                    <span className="value">
                      {typeof detailUser.walletBalance === 'number'
                        ? `${detailUser.walletBalance.toLocaleString('vi-VN')} VND`
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Created at</span>
                    <span className="value">
                      {detailUser.createdAt
                        ? new Date(detailUser.createdAt).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Bio</span>
                    <span className="value">
                      {detailUser.bio && detailUser.bio.trim().length > 0
                        ? detailUser.bio
                        : 'No bio'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {confirmUser && (
            <div className="admin-modal-backdrop" onClick={closeConfirm}>
              <div className="admin-modal small" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>{confirmUser.isActive ? 'Ban user' : 'Unban user'}</h3>
                  <button
                    type="button"
                    className="admin-modal-close"
                    onClick={closeConfirm}
                  >
                    ✕
                  </button>
                </div>
                <p className="confirm-text">
                  {confirmUser.isActive
                    ? 'Are you sure you want to ban this user? They will not be able to log in.'
                    : 'Are you sure you want to reactivate this user?'}
                </p>
                <div className="confirm-actions">
                  <button type="button" className="btn-outline" onClick={closeConfirm}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={confirmUser.isActive ? 'btn-reject-rose' : 'btn-approve-teal'}
                    onClick={async () => {
                      await handleToggleActive(confirmUser._id);
                      closeConfirm();
                    }}
                  >
                    {confirmUser.isActive ? 'Ban' : 'Unban'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminUsers;


