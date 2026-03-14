// src/pages/salon/StaffList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../lib/axios';
import { toast } from 'react-toastify';

import '../../assets/css/AdminDashboard.css';
import '../../assets/css/StaffList.css';
import ConfirmModal from '../../components/ui/ConfirmModal';

function StaffList() {
  const [staffs, setStaffs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter & Sort state
  const [filterStatus, setFilterStatus] = useState('all'); // all | active | inactive
  const [sortBy, setSortBy] = useState('name_asc'); // name_asc | name_desc | skills_desc | status_active_first

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [validationError, setValidationError] = useState('');

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    pendingData: null
  });

  useEffect(() => {
    fetchStaffs();
  }, []);

  // Listen for external events indicating staff list changed (e.g. after adding a staff)
  useEffect(() => {
    const handler = () => {
      fetchStaffs();
    };

    window.addEventListener('staff:added', handler);
    return () => window.removeEventListener('staff:added', handler);
  }, []);

  const fetchStaffs = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/api/staffs');
      let staffsData = response.data?.data || response.data || [];
      setStaffs(Array.isArray(staffsData) ? staffsData : []);
    } catch (err) {
      console.error('Failed to load staff list', err);
    } finally {
      setLoading(false);
    }
  };

  // Search + Filter + Sort by name, email OR skill
  const filteredStaffs = (() => {
    const searchLower = search.toLowerCase().trim();

    // initial filter by search and status
    let list = staffs.filter(staff => {
      // filter by status
      if (filterStatus === 'active' && !staff.isActive) return false;
      if (filterStatus === 'inactive' && staff.isActive) return false;

      if (!searchLower) return true;

      if (staff.fullName?.toLowerCase().includes(searchLower)) return true;
      if (staff.userId?.email?.toLowerCase().includes(searchLower)) return true;

      if (staff.skills && Array.isArray(staff.skills)) {
        return staff.skills.some(skill =>
          skill.name?.toLowerCase().includes(searchLower)
        );
      }

      return false;
    });

    // sort
    list.sort((a, b) => {
      const nameA = (a.fullName || '').toLowerCase();
      const nameB = (b.fullName || '').toLowerCase();
      const skillsA = (a.skills && Array.isArray(a.skills)) ? a.skills.length : 0;
      const skillsB = (b.skills && Array.isArray(b.skills)) ? b.skills.length : 0;

      switch (sortBy) {
        case 'name_asc':
          return nameA.localeCompare(nameB);
        case 'name_desc':
          return nameB.localeCompare(nameA);
        case 'skills_desc':
          return skillsB - skillsA || nameA.localeCompare(nameB);
        case 'status_inactive_first':
          return (a.isActive === b.isActive) ? nameA.localeCompare(nameB) : (a.isActive ? 1 : -1);
        case 'status_active_first':
        default:
          return (a.isActive === b.isActive) ? nameA.localeCompare(nameB) : (a.isActive ? -1 : 1);
      }
    });

    return list;
  })();

  const handleDelete = (staffId, currentStatus) => {
    const actionText = currentStatus ? 'deactivate' : 'reactivate';
    setConfirmModal({
      isOpen: true,
      pendingData: { staffId, currentStatus },
      title: `${currentStatus ? 'Ban' : 'Unban'} Staff`,
      message: `Are you sure you want to ${actionText} this staff member?`
    });
  };

  const executeDelete = async () => {
    if (!confirmModal.pendingData) return;
    const { staffId } = confirmModal.pendingData;

    try {
      setConfirmModal({ ...confirmModal, isOpen: false });
      await axiosClient.delete(`/api/staffs/${staffId}`);
      setStaffs(staffs.map(s =>
        s._id === staffId ? { ...s, isActive: !s.isActive } : s
      ));
      toast.success('Staff status updated successfully!');
    } catch (err) {
      toast.error('Failed to update staff status');
    }
  };

  const openEditModal = (staff) => {
    setSelectedStaff(staff);
    setEditName(staff.fullName || '');
    setEditPhone(staff.userId?.phone || '');

    const skillString = staff.skills && Array.isArray(staff.skills)
      ? staff.skills.map(s => s.name).join(', ')
      : '';
    setEditSkills(skillString);

    setValidationError('');
    setModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!editName.trim()) return setValidationError('Full Name is required.');
    if (!editPhone.trim()) {
      return setValidationError('Phone number is required.');
    }
    const cleanedPhone = editPhone.replace(/\D/g, '');
    if (cleanedPhone.length !== 10 || !/^\d{10}$/.test(cleanedPhone)) {
      return setValidationError('Phone number must be exactly 10 digits (e.g. 0901234567).');
    }
    if (!editSkills.trim()) return setValidationError('Skills are required.');

    try {
      const skillsArray = editSkills.split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(name => ({ name }));

      if (skillsArray.length === 0) {
        return setValidationError('Please enter at least one skill.');
      }

      await axiosClient.put(`/api/staffs/${selectedStaff._id}`, {
        fullName: editName,
        phone: editPhone
      });

      const skillResponse = await axiosClient.put(`/api/staffs/${selectedStaff._id}/skills`, {
        skills: skillsArray
      });

      const updatedSkills = skillResponse.data.data.skills;

      setStaffs(staffs.map(s =>
        s._id === selectedStaff._id
          ? {
            ...s,
            fullName: editName,
            skills: updatedSkills,
            userId: { ...s.userId, phone: editPhone }
          }
          : s
      ));

      setModalOpen(false);
      toast.success('Staff updated successfully!');
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to update staff');
    }
  };

  return (
    <>
      <div className="admin-wrapper">
        <main className="admin-content-full">
          <div className="page-inner">
            <div className="dynamic-header">
              <h1>Staff Management</h1>
           
            </div>

            <div className="section-divider" />
            
            <div className="admin-users-center">
              <div className="admin-card users-card">
                <div className="table-header-row">
                 
                  <span className="count-badge">
                    {filteredStaffs.length} staff member{filteredStaffs.length !== 1 ? 's' : ''}
                  </span>
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
                    placeholder="Search by name, email or skill"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="staff-search-input"
                    style={{
                      flex: '1 1 220px',
                      minWidth: '220px'
                    }}
                  />

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-end',
                      alignItems: 'center'
                    }}
                  >
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="staff-filter-select"
                    >
                      <option value="all">All statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="staff-sort-select"
                    >
                      <option value="name_asc">Name A → Z</option>
                      <option value="name_desc">Name Z → A</option>
                      <option value="skills_desc">Most skills</option>
                      <option value="status_active_first">Active first</option>
                      <option value="status_inactive_first">Inactive first</option>
                    </select>

                    <Link to="/stafflist/add">
                      <button type="button" className="btn-approve-teal">
                        + Add new staff
                      </button>
                    </Link>
                  </div>
                </div>

                {loading ? (
                  <div className="loading-state">Loading staff...</div>
                ) : (
                  <div className="table-responsive">
                    <table className="admin-table users-table">
                      <colgroup>
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '26%' }} />
                        <col style={{ width: '28%' }} />
                        <col style={{ width: '18%' }} />
                        <col style={{ width: '10%' }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Skills</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStaffs.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="no-data-cell">
                              No staff found.
                            </td>
                          </tr>
                        ) : (
                          filteredStaffs.map((staff) => (
                            <tr
                              key={staff._id}
                              className={!staff.isActive ? 'staff-row-inactive' : ''}
                            >
                              <td className="font-semibold">{staff.fullName}</td>
                              <td>{staff.userId?.email || '-'}</td>
                              <td>
                                {staff.skills && staff.skills.length > 0 ? (
                                  <div className="staff-skills-wrapper">
                                    {staff.skills.map((skill, idx) => (
                                      <span key={idx} className="staff-skill-tag">
                                        {skill.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#999', fontStyle: 'italic' }}>
                                    No skills
                                  </span>
                                )}
                              </td>
                              <td>
                                <span
                                  className={`staff-status-badge ${
                                    staff.isActive ? 'staff-status-active' : 'staff-status-inactive'
                                  }`}
                                >
                                  {staff.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td>
                                <div
                                  className="action-group"
                                  style={{ justifyContent: 'flex-end', gap: '8px' }}
                                >
                                  <button
                                    type="button"
                                    className="btn-outline"
                                    onClick={() => openEditModal(staff)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className={
                                      staff.isActive ? 'btn-reject-rose' : 'btn-approve-teal'
                                    }
                                    onClick={() => handleDelete(staff._id, staff.isActive)}
                                  >
                                    {staff.isActive ? 'Ban' : 'Unban'}
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

            <div style={{ marginTop: '24px' }}>
           
            </div>
          </div>
        </main>

        {/* Modal Edit */}
        {modalOpen && selectedStaff && (
          <div className="staff-modal-overlay" onClick={() => setModalOpen(false)}>
            <div className="staff-modal-content" onClick={e => e.stopPropagation()}>
              <h2 className="staff-modal-title">Edit Staff Information</h2>

              {validationError && (
                <div className="staff-error-alert">{validationError}</div>
              )}

              <div className="staff-form-group">
                <label className="staff-form-label">Email (Locked)</label>
                <input
                  type="text"
                  value={selectedStaff.userId?.email || ''}
                  disabled
                  className="staff-input staff-input-disabled"
                />
              </div>

              <div className="staff-form-group">
                <label className="staff-form-label">
                  Full Name <span className="staff-form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="staff-input"
                />
              </div>

              <div className="staff-form-group">
                <label className="staff-form-label">
                  Phone Number <span className="staff-form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="e.g. 0901234567"
                  className="staff-input"
                />
              </div>

              <div className="staff-form-group">
                <label className="staff-form-label">
                  Skills <span className="staff-form-label-required">*</span>
                </label>
                <input
                  type="text"
                  value={editSkills}
                  onChange={e => setEditSkills(e.target.value)}
                  placeholder="e.g. Haircut, Coloring, Massage"
                  className="staff-input"
                />
                <small style={{ color: '#666', display: 'block', marginTop: '6px' }}>
                  Separate multiple skills with commas.
                </small>
              </div>

              <div className="staff-modal-actions">
                <button onClick={() => setModalOpen(false)} className="staff-btn-cancel">
                  Cancel
                </button>
                <button onClick={handleSaveChanges} className="staff-btn-save">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

      

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={executeDelete}
          onCancel={() => setConfirmModal({ isOpen: false, pendingData: null })}
          confirmText={confirmModal.pendingData?.currentStatus ? 'Ban Staff' : 'Unban Staff'}
          type={confirmModal.pendingData?.currentStatus ? 'danger' : 'primary'}
        />
      </div>
    </>
  );
}

export default StaffList;