
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import authApi from '../../features/auth/api/authApi';
import { FaUser, FaEdit, FaLock, FaInfoCircle, FaIdCard } from 'react-icons/fa';

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

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (!validateForm()) {
            return;
        }

        try {
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
            <div className="container" style={{ alignItems: 'center', paddingTop: '20px', minHeight: 'calc(100vh - 80px)', flexDirection: 'column' }}>



                <div className="profile-wrapper" style={{ display: 'flex', width: '100%', maxWidth: '1000px', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                    {/* Sidebar / Tabs */}
                    <div className="profile-sidebar" style={{ flex: '1', minWidth: '250px', background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', height: 'fit-content' }}>
                        <div className="profile-menu">
                            <button
                                onClick={() => setActiveTab('basic')}
                                style={{
                                    width: '100%', padding: '12px 15px', border: 'none', background: activeTab === 'basic' ? 'var(--bg-secondary)' : 'transparent',
                                    textAlign: 'left', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
                                    color: activeTab === 'basic' ? 'var(--primary-color)' : 'var(--text-main)',
                                    fontWeight: activeTab === 'basic' ? '600' : '400',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                            >
                                <FaUser /> Basic Info
                            </button>
                            <button
                                onClick={() => setActiveTab('detail')}
                                style={{
                                    width: '100%', padding: '12px 15px', border: 'none', background: activeTab === 'detail' ? 'var(--bg-secondary)' : 'transparent',
                                    textAlign: 'left', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
                                    color: activeTab === 'detail' ? 'var(--primary-color)' : 'var(--text-main)',
                                    fontWeight: activeTab === 'detail' ? '600' : '400',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                            >
                                <FaIdCard /> Profile Detail
                            </button>
                            <button
                                onClick={() => setActiveTab('update')}
                                style={{
                                    width: '100%', padding: '12px 15px', border: 'none', background: activeTab === 'update' ? 'var(--bg-secondary)' : 'transparent',
                                    textAlign: 'left', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
                                    color: activeTab === 'update' ? 'var(--primary-color)' : 'var(--text-main)',
                                    fontWeight: activeTab === 'update' ? '600' : '400',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                            >
                                <FaEdit /> Update Profile
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                style={{
                                    width: '100%', padding: '12px 15px', border: 'none', background: activeTab === 'security' ? 'var(--bg-secondary)' : 'transparent',
                                    textAlign: 'left', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px',
                                    color: activeTab === 'security' ? 'var(--primary-color)' : 'var(--text-main)',
                                    fontWeight: activeTab === 'security' ? '600' : '400',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}
                            >
                                <FaLock /> Security
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="profile-content" style={{ flex: '3', minWidth: '300px', background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-md)', minHeight: '600px' }}>
                        {message.text && (
                            <div className={message.type === 'error' ? 'error-message' : 'success-message'}>
                                {message.text}
                            </div>
                        )}

                        {/* 1. Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ marginBottom: '2rem', color: 'var(--primary-color)', textAlign: 'left' }}>Basic Information</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <img
                                        src={user?.avatar || 'https://via.placeholder.com/150'}
                                        alt="Profile"
                                        style={{ width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--primary-color)', padding: '3px' }}
                                    />
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700' }}>{user?.fullName}</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{user?.email}</p>
                                    <span style={{
                                        fontSize: '0.9rem', padding: '4px 12px', borderRadius: '20px',
                                        background: 'var(--bg-secondary)', color: 'var(--primary-color)', fontWeight: '600', textTransform: 'uppercase'
                                    }}>
                                        {user?.role}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* 2. Profile Detail Tab */}
                        {activeTab === 'detail' && (
                            <div>
                                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Full Profile Details</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', fontSize: '1rem' }}>
                                    <div style={{ color: 'var(--text-muted)' }}>Full Name:</div>
                                    <div style={{ fontWeight: '500' }}>{user?.fullName}</div>

                                    <div style={{ color: 'var(--text-muted)' }}>Email:</div>
                                    <div style={{ fontWeight: '500' }}>{user?.email}</div>

                                    <div style={{ color: 'var(--text-muted)' }}>Phone:</div>
                                    <div style={{ fontWeight: '500' }}>{user?.phone || 'Not set'}</div>

                                    <div style={{ color: 'var(--text-muted)' }}>Date of Birth:</div>
                                    <div style={{ fontWeight: '500' }}>
                                        {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Not set'}
                                    </div>

                                    <div style={{ color: 'var(--text-muted)' }}>Account Created:</div>
                                    <div style={{ fontWeight: '500' }}>{new Date(user?.createdAt).toLocaleDateString('vi-VN')}</div>

                                    <div style={{ color: 'var(--text-muted)' }}>Bio:</div>
                                    <div style={{ fontWeight: '500', lineHeight: '1.6' }}>{user?.bio || 'No bio yet...'}</div>
                                </div>
                            </div>
                        )}

                        {/* 3. Update Profile Tab (With Date Picker, No Avatar) */}
                        {activeTab === 'update' && (
                            <div>
                                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Update Information</h2>
                                <form onSubmit={handleUpdateProfile}>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            style={errors.fullName ? { border: '1px solid red' } : {}}
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        />
                                        {errors.fullName && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.fullName}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            style={errors.phone ? { border: '1px solid red' } : {}}
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        />
                                        {errors.phone && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.phone}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Date of Birth</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            style={errors.dateOfBirth ? { border: '1px solid red' } : {}}
                                            value={formData.dateOfBirth}
                                            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                        />
                                        {errors.dateOfBirth && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.dateOfBirth}</span>}
                                    </div>
                                    <div className="form-group">
                                        <label>Bio</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            style={Object.assign({ fontFamily: 'inherit' }, errors.bio ? { border: '1px solid red' } : {})}
                                            value={formData.bio}
                                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                                        ></textarea>
                                        {errors.bio && <span style={{ color: 'red', fontSize: '0.85rem' }}>{errors.bio}</span>}
                                    </div>
                                    <button type="submit" className="btn" style={{ maxWidth: '200px' }}>Save Changes</button>
                                </form>
                            </div>
                        )}

                        {/* 4. Security Tab */}
                        {activeTab === 'security' && (
                            <div>
                                <h2 style={{ marginBottom: '1.5rem', color: 'var(--primary-color)' }}>Change Password</h2>
                                <form onSubmit={handleChangePassword}>
                                    <div className="form-group">
                                        <label>Current Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            required
                                            minLength="8"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn" style={{ maxWidth: '200px' }}>Update Password</button>
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
