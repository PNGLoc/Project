
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import authApi from '../../features/auth/api/authApi';
import { FaUser, FaEdit, FaLock, FaIdCard } from 'react-icons/fa';
import '../../assets/css/ProfilePage.css';

const ProfilePage = () => {
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState('basic');
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Update Profile State
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        bio: '',
        dateOfBirth: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');

    // Password State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    // Error State
    const [errors, setErrors] = useState({});

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
        fetchProfile();
    }, [searchParams]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await authApi.getProfile();
            setUser(data);

            // Format date for input (YYYY-MM-DD)
            let formattedDoB = '';
            if (data.dateOfBirth) {
                const date = new Date(data.dateOfBirth);
                formattedDoB = date.toISOString().split('T')[0];
            }

            setFormData({
                fullName: data.fullName,
                phone: data.phone || '',
                bio: data.bio || '',
                dateOfBirth: formattedDoB
            });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to load profile' });
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const { fullName, phone, dateOfBirth, bio } = formData;

        // 1. Full Name Validation
        if (!fullName.trim()) {
            newErrors.fullName = 'Full Name is required';
        } else if (fullName.length < 5) {
            newErrors.fullName = 'Full Name must be at least 5 characters';
        } else if (/^\d+$/.test(fullName)) {
            newErrors.fullName = 'Full Name cannot contain only numbers';
        } else if (/[!@#$%^&*(),.?":{}|<>]/.test(fullName)) {
            newErrors.fullName = 'Full Name cannot contain special characters';
        }

        // 2. Phone Number Validation
        if (!phone.trim()) {
            newErrors.phone = 'Phone Number is required';
        } else if (!/^\d+$/.test(phone)) {
            newErrors.phone = 'Phone Number must contain only numbers';
        } else if (phone.length !== 10) {
            newErrors.phone = 'Phone Number must be exactly 10 digits';
        }

        // 3. Date of Birth Validation
        if (!dateOfBirth) {
            newErrors.dateOfBirth = 'Date of Birth is required';
        } else {
            const today = new Date();
            const dob = new Date(dateOfBirth);
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();

            if (dob > today) {
                newErrors.dateOfBirth = 'Date of Birth cannot be in the future';
            } else if (age < 13 || (age === 13 && monthDiff < 0) || (age === 13 && monthDiff === 0 && today.getDate() < dob.getDate())) {
                // Simple age check: if year diff < 13, fail. 
                // If year diff == 13, check month/day.
                newErrors.dateOfBirth = 'You must be at least 13 years old';
            }
        }

        // 4. Bio Validation
        if (bio && bio.length > 255) {
            newErrors.bio = 'Bio cannot exceed 255 characters';
        } else if (bio && /<script>/.test(bio.toLowerCase())) {
            newErrors.bio = 'Bio cannot contain scripts';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setAvatarFile(file);
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!validateForm()) {
            return;
        }

        try {
            // Upload avatar first if user selected a new image
            if (avatarFile) {
                const formDataAvatar = new FormData();
                formDataAvatar.append('avatar', avatarFile);
                const updatedUserWithAvatar = await authApi.updateAvatar(formDataAvatar);
                setUser(updatedUserWithAvatar);
                setAvatarFile(null);
                if (avatarPreview) {
                    URL.revokeObjectURL(avatarPreview);
                    setAvatarPreview('');
                }
            }

            const updatedUser = await authApi.updateProfile(formData);
            setUser(updatedUser);
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Update failed' });
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        try {
            await authApi.changePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            setMessage({ type: 'success', text: 'Password changed successfully' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Change password failed' });
        }
    };

    if (loading) return <div className="container" style={{ paddingTop: '30px' }}>Loading...</div>;

    return (
        <>
            {/* Header and home-container moved to MainLayout */}
            <div className="container profile-page-container">
                <div className="profile-wrapper">

                    {/* Sidebar / Tabs */}
                    <div className="profile-sidebar">
                        <div className="profile-menu">
                            <button
                                onClick={() => setActiveTab('basic')}
                                className={`profile-menu-button ${activeTab === 'basic' ? 'active' : ''}`}
                            >
                                <FaUser /> Basic Info
                            </button>
                            <button
                                onClick={() => setActiveTab('detail')}
                                className={`profile-menu-button ${activeTab === 'detail' ? 'active' : ''}`}
                            >
                                <FaIdCard /> Profile Detail
                            </button>
                            <button
                                onClick={() => setActiveTab('update')}
                                className={`profile-menu-button ${activeTab === 'update' ? 'active' : ''}`}
                            >
                                <FaEdit /> Update Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`profile-menu-button ${activeTab === 'security' ? 'active' : ''}`}
                            >
                                <FaLock /> Security
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="profile-content">
                        {message.text && (
                            <div className={`profile-message ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        {/* 1. Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <div>
                                <h2 className="profile-section-title">Basic Information</h2>
                                <div className="profile-basic-main">
                                    <img
                                        src={user?.avatar || 'https://via.placeholder.com/150'}
                                        alt="Profile"
                                        className="profile-avatar"
                                    />
                                    <h2 className="profile-name">{user?.fullName}</h2>
                                    <p className="profile-email">{user?.email}</p>
                                    <span className="profile-role-pill">
                                        {user?.role}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 2. Profile Detail Tab */}
                        {activeTab === 'detail' && (
                            <div>
                                <h2 className="profile-section-title">Full Profile Details</h2>
                                <div className="profile-detail-grid">
                                    <div className="profile-detail-label">Full Name:</div>
                                    <div className="profile-detail-value">{user?.fullName}</div>

                                    <div className="profile-detail-label">Email:</div>
                                    <div className="profile-detail-value">{user?.email}</div>

                                    <div className="profile-detail-label">Phone:</div>
                                    <div className="profile-detail-value">{user?.phone || 'Not set'}</div>

                                    <div className="profile-detail-label">Date of Birth:</div>
                                    <div className="profile-detail-value">
                                        {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Not set'}
                                    </div>

                                    <div className="profile-detail-label">Account Created:</div>
                                    <div className="profile-detail-value">{new Date(user?.createdAt).toLocaleDateString('vi-VN')}</div>

                                    <div className="profile-detail-label">Bio:</div>
                                    <div className="profile-detail-value" style={{ lineHeight: '1.6' }}>{user?.bio || 'No bio yet...'}</div>
                                </div>
                            </div>
                        )}

                        {/* 3. Update Profile Tab (With Date Picker, No Avatar) */}
                        {activeTab === 'update' && (
                            <div>
                                <h2 className="profile-section-title">Update Information</h2>

                                <div className="profile-avatar-upload-wrapper">
                                    <img
                                        src={avatarPreview || user?.avatar || 'https://via.placeholder.com/150'}
                                        alt="Avatar preview"
                                        className="profile-avatar-upload-image"
                                    />
                                    <div className="profile-avatar-upload-actions">
                                        <label htmlFor="avatar-input" className="profile-avatar-upload-button">
                                            Change profile photo
                                        </label>
                                        <input
                                            id="avatar-input"
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={handleAvatarChange}
                                        />
                                    </div>
                                </div>

                                <form onSubmit={handleUpdateProfile}>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">Full Name</label>
                                        <input
                                            type="text"
                                            className={`profile-form-control ${errors.fullName ? 'error' : ''}`}
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                        {errors.fullName && <span className="profile-error-text">{errors.fullName}</span>}
                                    </div>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">Phone Number</label>
                                        <input
                                            type="text"
                                            className={`profile-form-control ${errors.phone ? 'error' : ''}`}
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                        {errors.phone && <span className="profile-error-text">{errors.phone}</span>}
                                    </div>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">Date of Birth</label>
                                        <input
                                            type="date"
                                            className={`profile-form-control ${errors.dateOfBirth ? 'error' : ''}`}
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        />
                                        {errors.dateOfBirth && <span className="profile-error-text">{errors.dateOfBirth}</span>}
                                    </div>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">Bio</label>
                                        <textarea
                                            className={`profile-form-control ${errors.bio ? 'error' : ''}`}
                                            rows="4"
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        ></textarea>
                                        {errors.bio && <span className="profile-error-text">{errors.bio}</span>}
                                    </div>
                                    <button type="submit" className="btn profile-submit-btn">Save Changes</button>
                                </form>
                            </div>
                        )}

                        {/* 4. Security Tab */}
                        {activeTab === 'security' && (
                            <div>
                                <h2 className="profile-section-title">Change Password</h2>
                                <form onSubmit={handleChangePassword}>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">Current Password</label>
                                        <input
                                            type="password"
                                            className="profile-form-control"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">New Password</label>
                                        <input
                                            type="password"
                                            className="profile-form-control"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            required
                                            minLength="8"
                                        />
                                    </div>
                                    <div className="profile-form-group">
                                        <label className="profile-form-label">Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="profile-form-control"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn profile-submit-btn">Update Password</button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ProfilePage;
