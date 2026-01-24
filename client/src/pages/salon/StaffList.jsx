// src/pages/salon/StaffList.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosClient from '../../lib/axios';
import HeaderHome from '../../components/layout/HeaderHome';
import '../../assets/css/StaffList.css'; // Import CSS

function StaffList() {
  const [staffs, setStaffs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    fetchStaffs();
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

  // Tìm kiếm theo tên, email HOẶC skill
  const filteredStaffs = staffs.filter(staff => {
    const searchLower = search.toLowerCase().trim();
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

  const handleDelete = async (staffId, currentStatus) => {
    const actionText = currentStatus ? 'deactivate' : 'reactivate';
    if (!window.confirm(`Are you sure you want to ${actionText} this staff member?`)) return;

    try {
      await axiosClient.delete(`/api/staffs/${staffId}`);
      setStaffs(staffs.map(s =>
        s._id === staffId ? { ...s, isActive: !s.isActive } : s
      ));
    } catch (err) {
      alert('Failed to update staff status');
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
      alert('Staff updated successfully!');
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to update staff');
    }
  };

  return (
    <>
      <HeaderHome />
      <div className="staff-management-container">
        <h1 className="staff-management-title">Staff Management</h1>
        <p className="staff-management-subtitle">Manage your salon staff members.</p>

        <div className="staff-search-add-wrapper">
          <input
            type="text"
            placeholder="Search by name, email or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="staff-search-input"
          />
          <Link to="/salon/staff/add">
            <button className="staff-add-button">+ Add New Staff</button>
          </Link>
        </div>

        {loading ? (
          <p>Loading staff list...</p>
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Full Name</th>
                <th>Skills</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaffs.map(staff => (
                <tr
                  key={staff._id}
                  className={!staff.isActive ? 'staff-row-inactive' : ''}
                >
                  <td>
                    <span className={`staff-status-badge ${staff.isActive ? 'staff-status-active' : 'staff-status-inactive'}`}>
                      {staff.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{staff.fullName}</td>
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
                      <span style={{ color: '#999', fontStyle: 'italic' }}>No skills</span>
                    )}
                  </td>
                  <td>{staff.userId?.email || '-'}</td>
                  <td className="staff-actions">
                    <button onClick={() => openEditModal(staff)} className="staff-btn-edit">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(staff._id, staff.isActive)}
                      className={staff.isActive ? 'staff-btn-delete' : 'staff-btn-restore'}
                    >
                      {staff.isActive ? 'Delete' : 'Restore'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

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

        <div>
          <Link to="/salon/dashboard" className="staff-back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}

export default StaffList;