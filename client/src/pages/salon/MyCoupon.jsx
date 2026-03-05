import { useEffect, useState } from 'react';
import couponApi from '../../features/coupon/api/couponApi';
import '../../assets/css/AdminDashboard.css';

const MyCoupon = () => {
  const [coupons, setCoupons] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 8, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [detailCoupon, setDetailCoupon] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [toast, setToast] = useState({ type: '', message: '' });
  const [confirmCoupon, setConfirmCoupon] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const PAGE_SIZE = 8;

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    minPurchaseAmount: '',
    maxDiscountAmount: '',
    startDate: '',
    endDate: '',
    usageLimit: '',
    description: '',
    isActive: true
  });

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const params = {
        page: 1,
        limit: 1000,
        search: searchTerm,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        sortBy,
        sortOrder
      };
      const data = await couponApi.getCoupons(params);
      const list = data.coupons || [];
      setCoupons(list);
      setPagination({
        page: 1,
        limit: PAGE_SIZE,
        pages: Math.max(1, Math.ceil(list.length / PAGE_SIZE)),
        total: list.length
      });
    } catch (error) {
      console.error('[MY COUPON] fetch error', error);
      showToast('error', error.response?.data?.message || 'Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  const handleChangePage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.pages) return;
    setPagination((prev) => ({
      ...prev,
      page: nextPage
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

  const handleViewDetail = async (couponId) => {
    try {
      const data = await couponApi.getCouponById(couponId);
      setDetailCoupon(data);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('[MY COUPON] get detail error', error);
      showToast('error', error.response?.data?.message || 'Failed to load coupon detail');
    }
  };

  const openForm = (coupon = null) => {
    if (coupon) {
      setIsEditMode(true);
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minPurchaseAmount: coupon.minPurchaseAmount,
        maxDiscountAmount: coupon.maxDiscountAmount || '',
        startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
        endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : '',
        usageLimit: coupon.usageLimit,
        description: coupon.description || '',
        isActive: coupon.isActive
      });
    } else {
      setIsEditMode(false);
      setEditingCoupon(null);
      setFormData({
        code: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minPurchaseAmount: '',
        maxDiscountAmount: '',
        startDate: '',
        endDate: '',
        usageLimit: '',
        description: '',
        isActive: true
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setIsEditMode(false);
    setEditingCoupon(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setProcessingId('form');
      const submitData = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minPurchaseAmount: parseFloat(formData.minPurchaseAmount) || 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: parseInt(formData.usageLimit)
      };

      if (isEditMode) {
        await couponApi.updateCoupon(editingCoupon._id, submitData);
        showToast('success', 'Coupon updated successfully');
      } else {
        await couponApi.createCoupon(submitData);
        showToast('success', 'Coupon created successfully');
      }

      closeForm();
      fetchCoupons();
    } catch (error) {
      console.error('[MY COUPON] submit error', error);
      showToast('error', error.response?.data?.message || 'Failed to save coupon');
    } finally {
      setProcessingId(null);
    }
  };

  const openConfirm = (coupon) => {
    setConfirmCoupon(coupon);
  };

  const closeConfirm = () => {
    setConfirmCoupon(null);
  };

  const handleDelete = async () => {
    try {
      setProcessingId(confirmCoupon._id);
      await couponApi.deleteCoupon(confirmCoupon._id);
      showToast('success', 'Coupon deleted successfully');
      closeConfirm();
      fetchCoupons();
    } catch (error) {
      console.error('[MY COUPON] delete error', error);
      showToast('error', error.response?.data?.message || 'Failed to delete coupon');
    } finally {
      setProcessingId(null);
    }
  };

  const getCouponStatus = (coupon) => {
    if (!coupon.isActive) return { label: 'Inactive', class: 'status-banned-pill' };
    const now = new Date();
    const start = new Date(coupon.startDate);
    const end = new Date(coupon.endDate);
    
    if (now < start) return { label: 'Upcoming', class: 'status-upcoming-pill' };
    if (now > end) return { label: 'Expired', class: 'status-banned-pill' };
    if (coupon.usedCount >= coupon.usageLimit) return { label: 'Used Up', class: 'status-banned-pill' };
    return { label: 'Active', class: 'status-active-pill' };
  };

  // Filter và paginate
  let filteredCoupons = coupons;
  
  // Additional client-side filtering for ACTIVE status (check usedCount < usageLimit)
  if (statusFilter === 'ACTIVE') {
    filteredCoupons = filteredCoupons.filter(coupon => {
      const now = new Date();
      const start = new Date(coupon.startDate);
      const end = new Date(coupon.endDate);
      return coupon.isActive && 
             now >= start && 
             now <= end && 
             coupon.usedCount < coupon.usageLimit;
    });
  }
  
  const totalFiltered = filteredCoupons.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const currentPage = Math.min(pagination.page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedCoupons = filteredCoupons.slice(startIndex, startIndex + PAGE_SIZE);

  const displayedPagination = {
    page: currentPage,
    pages: totalPages,
    total: totalFiltered
  };

  return (
    <div className="admin-wrapper">
      {toast.message && (
        <div className={`admin-toast ${toast.type === 'error' ? 'error' : 'success'}`}>
          {toast.message}
        </div>
      )}

      <main className="admin-content-full">
        <div className="page-inner">
          <div className="dynamic-header">
            <h1>Coupon Management</h1>
            <p>Create and manage discount coupons for your salon</p>
          </div>

          <div className="section-divider" />

          <div className="admin-users-center">
            <div className="admin-card users-card">
              <div className="table-header-row">
                <h3>Coupons</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span className="count-badge">{displayedPagination.total} coupons</span>
                  <button
                    type="button"
                    className="btn-approve-teal"
                    onClick={() => openForm()}
                    style={{ padding: '8px 16px', fontSize: '14px' }}
                  >
                    + Add Coupon
                  </button>
                </div>
              </div>

              <div
                className="filters-row"
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '16px',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <input
                  type="text"
                  placeholder="Search by code"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  style={{
                    flex: '1 1 220px',
                    minWidth: '200px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '14px'
                  }}
                />

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end'
                  }}
                >
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="ALL">All status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="UPCOMING">Upcoming</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="EXPIRED">Expired</option>
                    <option value="USED_UP">Used Up</option>
                  </select>

                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      fontSize: '14px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="createdAt-asc">Oldest First</option>
                    <option value="code-asc">Code A-Z</option>
                    <option value="code-desc">Code Z-A</option>
                    <option value="endDate-asc">Expiring Soon</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">Loading coupons...</div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-table users-table">
                    <colgroup>
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '15%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '19%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Min Purchase</th>
                        <th>Status</th>
                        <th>Usage</th>
                        <th>Expires</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCoupons.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="no-data-cell">
                            No coupons found.
                          </td>
                        </tr>
                      ) : (
                        paginatedCoupons.map((coupon) => {
                          const status = getCouponStatus(coupon);
                          const discountText =
                            coupon.discountType === 'PERCENTAGE'
                              ? `${coupon.discountValue}%`
                              : `${coupon.discountValue.toLocaleString('vi-VN')} VND`;
                          return (
                            <tr key={coupon._id}>
                              <td className="font-semibold">{coupon.code}</td>
                              <td>{discountText}</td>
                              <td>
                                {coupon.minPurchaseAmount > 0
                                  ? `${coupon.minPurchaseAmount.toLocaleString('vi-VN')} VND`
                                  : 'No minimum'}
                              </td>
                              <td>
                                <span className={status.class}>{status.label}</span>
                              </td>
                              <td className="text-gray">
                                {coupon.usedCount} / {coupon.usageLimit}
                              </td>
                              <td className="text-gray">
                                {coupon.endDate
                                  ? new Date(coupon.endDate).toLocaleDateString()
                                  : '-'}
                              </td>
                              <td>
                                <div className="action-group" style={{ justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => handleViewDetail(coupon._id)}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => openForm(coupon)}
                                    disabled={processingId === coupon._id}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-reject-rose"
                                    onClick={() => openConfirm(coupon)}
                                    disabled={processingId === coupon._id}
                                  >
                                    {processingId === coupon._id ? 'Processing...' : 'Delete'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
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

          {/* Detail Modal */}
          {isDetailOpen && detailCoupon && (
            <div className="admin-modal-backdrop" onClick={() => setIsDetailOpen(false)}>
              <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>Coupon Detail</h3>
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
                    <span className="label">Code</span>
                    <span className="value">{detailCoupon.code}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Discount Type</span>
                    <span className="value">{detailCoupon.discountType}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Discount Value</span>
                    <span className="value">
                      {detailCoupon.discountType === 'PERCENTAGE'
                        ? `${detailCoupon.discountValue}%`
                        : `${detailCoupon.discountValue.toLocaleString('vi-VN')} VND`}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Min Purchase Amount</span>
                    <span className="value">
                      {detailCoupon.minPurchaseAmount > 0
                        ? `${detailCoupon.minPurchaseAmount.toLocaleString('vi-VN')} VND`
                        : 'No minimum'}
                    </span>
                  </div>
                  {detailCoupon.maxDiscountAmount && (
                    <div className="detail-row">
                      <span className="label">Max Discount Amount</span>
                      <span className="value">
                        {detailCoupon.maxDiscountAmount.toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Start Date</span>
                    <span className="value">
                      {detailCoupon.startDate
                        ? new Date(detailCoupon.startDate).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">End Date</span>
                    <span className="value">
                      {detailCoupon.endDate
                        ? new Date(detailCoupon.endDate).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Usage Limit</span>
                    <span className="value">{detailCoupon.usageLimit}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Used Count</span>
                    <span className="value">{detailCoupon.usedCount}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Status</span>
                    <span className={getCouponStatus(detailCoupon).class}>
                      {getCouponStatus(detailCoupon).label}
                    </span>
                  </div>
                  {detailCoupon.description && (
                    <div className="detail-row">
                      <span className="label">Description</span>
                      <span className="value">{detailCoupon.description}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Created at</span>
                    <span className="value">
                      {detailCoupon.createdAt
                        ? new Date(detailCoupon.createdAt).toLocaleString()
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Modal */}
          {isFormOpen && (
            <div className="admin-modal-backdrop" onClick={closeForm}>
              <div
                className="admin-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '720px' }}
              >
                <div className="admin-modal-header">
                  <h3>{isEditMode ? 'Edit Coupon' : 'Create New Coupon'}</h3>
                  <button type="button" className="admin-modal-close" onClick={closeForm}>
                    ✕
                  </button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div
                    style={{
                      padding: '20px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      columnGap: '16px',
                      rowGap: '16px'
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({ ...formData, code: e.target.value.toUpperCase() })
                        }
                        placeholder="COUPON123"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Discount Type *
                      </label>
                      <select
                        required
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px',
                          backgroundColor: 'white'
                        }}
                      >
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FIXED_AMOUNT">Fixed Amount</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Discount Value *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                        step={formData.discountType === 'PERCENTAGE' ? '1' : '1000'}
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        placeholder={formData.discountType === 'PERCENTAGE' ? '10' : '50000'}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                      <small style={{ color: '#6b7280', fontSize: '12px' }}>
                        {formData.discountType === 'PERCENTAGE'
                          ? 'Enter percentage (0-100)'
                          : 'Enter amount in VND'}
                      </small>
                    </div>

                    {formData.discountType === 'PERCENTAGE' && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                          Max Discount Amount (Optional)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.maxDiscountAmount}
                          onChange={(e) =>
                            setFormData({ ...formData, maxDiscountAmount: e.target.value })
                          }
                          placeholder="100000"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Min Purchase Amount *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="1000"
                        value={formData.minPurchaseAmount}
                        onChange={(e) =>
                          setFormData({ ...formData, minPurchaseAmount: e.target.value })
                        }
                        placeholder="0"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Usage Limit *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.usageLimit}
                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                        placeholder="100"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Optional description"
                        rows="3"
                        maxLength="500"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          fontSize: '14px',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        />
                        <span>Active</span>
                      </label>
                    </div>
                  </div>

                  <div className="confirm-actions" style={{ padding: '20px', borderTop: '1px solid #e5e7eb' }}>
                    <button type="button" className="btn-outline" onClick={closeForm}>
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-approve-teal"
                      disabled={processingId === 'form'}
                    >
                      {processingId === 'form' ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirm Modal */}
          {confirmCoupon && (
            <div className="admin-modal-backdrop" onClick={closeConfirm}>
              <div className="admin-modal small" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h3>Delete Coupon</h3>
                  <button type="button" className="admin-modal-close" onClick={closeConfirm}>
                    ✕
                  </button>
                </div>
                <p className="confirm-text">
                  Are you sure you want to delete coupon &quot;{confirmCoupon.code}&quot;? This action
                  cannot be undone.
                </p>
                <div className="confirm-actions">
                  <button type="button" className="btn-outline" onClick={closeConfirm}>
                    Cancel
                  </button>
                  <button type="button" className="btn-reject-rose" onClick={handleDelete}>
                    Delete
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

export default MyCoupon;

