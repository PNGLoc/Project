import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi';
import { GoBriefcase, GoPerson } from 'react-icons/go';
import { FiBookOpen, FiTag } from 'react-icons/fi';
import { FaUsers } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import '../../assets/css/HeaderHome.css';

const HeaderHome = () => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    // --- 1. HÀM ĐỌC USER TỪ LOCALSTORAGE (Tách ra để tái sử dụng) ---
    const fetchUser = () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                setCurrentUser(userObj);
            } catch (e) {
                console.error("Lỗi đọc user:", e);
                setCurrentUser(null);
            }
        } else {
            setCurrentUser(null);
        }
    };

    // --- 2. useEffect: LẤY DATA & LẮNG NGHE SỰ KIỆN ---
    useEffect(() => {
        // Lấy dữ liệu lần đầu khi vào trang
        fetchUser();

        // Lắng nghe sự kiện 'userUpdated' (được phát ra từ trang Login hoặc Register)
        const handleUserUpdate = () => {
            console.log("Header nhận tín hiệu: Cập nhật thông tin User!");
            fetchUser();
        };

        // Lắng nghe sự kiện click ra ngoài để đóng menu
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        window.addEventListener('userUpdated', handleUserUpdate);
        document.addEventListener('mousedown', handleClickOutside);

        // Cleanup khi component bị hủy
        return () => {
            window.removeEventListener('userUpdated', handleUserUpdate);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // --- 3. HÀM ĐĂNG XUẤT ---
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Bắn sự kiện để cập nhật lại state thành null
        window.dispatchEvent(new Event('userUpdated'));

        setIsDropdownOpen(false);
        navigate('/');
    };

    // --- 4. BIẾN LOGIC KIỂM TRA TRẠNG THÁI ---
    // User đã có Salon ID chưa?
    const hasSalon = !!currentUser?.salonId;
    // User đã được Admin duyệt lên chức SALON_OWNER chưa?
    const isOfficialOwner = currentUser?.role === 'SALON_OWNER';
    const isCustomer = currentUser?.role === 'CUSTOMER';
    const isStaff = currentUser?.role === 'STAFF';

    return (
        <header className="header">
            <div className="header-content">
                {/* Logo */}
                <Link to="/" className="logo-section">
                    <HiSparkles size={24} color="#0d9488" />
                    <span>SalonHub</span>
                </Link>

                {/* Menu */}
                <nav className="nav-links">
                    <NavLink to="/" className={({ isActive }) => isActive ? "active" : ""}>Home</NavLink>
                    <NavLink to="/search">Search</NavLink>
                    {isCustomer && (
                        <>
                            <NavLink to="/book-appointment">Book</NavLink>
                        </>)
                    }
                    <NavLink to="/lookbook">Lookbook</NavLink>
                    <NavLink to="/coupons">Coupons</NavLink>
                    <NavLink to="/ai-analysis">AI Analysis</NavLink>
                </nav>

                {/* Actions */}
                <div className="auth-actions">
                    {currentUser && <NotificationBell />}
                    {currentUser ? (
                        <div className="user-dropdown-container" ref={dropdownRef}>
                            {/* Avatar Trigger */}
                            <div
                                className="user-profile-trigger"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <div className="avatar-circle">
                                    {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : "U"}
                                </div>
                                <div className="user-info-text">
                                    <span className="user-name">Hi, {currentUser.fullName || "User"}</span>
                                    {/* Hiển thị Role */}
                                    <span className="user-role-label">
                                        {isOfficialOwner ? 'SALON OWNER' : currentUser.role}
                                    </span>
                                </div>
                                <span className={`arrow-icon ${isDropdownOpen ? 'open' : ''}`}>▾</span>
                            </div>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="dropdown-menu">
                                    <div className="dropdown-info-mobile">
                                        <strong>{currentUser.fullName}</strong>
                                        <span style={{ fontSize: '10px', color: '#0d9488' }}>
                                            {isOfficialOwner ? 'SALON OWNER' : currentUser.role}
                                        </span>
                                    </div>

                                    <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        <GoPerson /> Profile
                                    </Link>

                                    <Link to="/post/my-posts" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                        <FiBookOpen /> My Posts
                                    </Link>
                                    {isCustomer && (
                                        <>
                                            <Link to="/booking-history" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                                <FiBookOpen /> My Bookings
                                            </Link>
                                        </>)
                                    }
                                    {/* --- LOGIC HIỂN THỊ QUAN TRỌNG --- */}
                                    {isOfficialOwner ? (
                                        // Owner: show My Salon and My Staff
                                        <>
                                            <Link to="/salon" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                                <GoBriefcase /> My Salon
                                            </Link>
                                            <Link to="/stafflist" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                                <FaUsers /> My Staff
                                            </Link>
                                            <Link to="/salon/coupons" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                                <FiTag /> My Coupons
                                            </Link>
                                        </>
                                    ) : isStaff ? (
                                        // Staff: show Staff Dashboard & My Schedule
                                        <>
                                            <Link to="/staff/dashboard" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                                <GoBriefcase /> Staff Dashboard
                                            </Link>
                                            <Link to="/salon/schedule" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                                <FiBookOpen /> My Schedule
                                            </Link>
                                        </>
                                    ) : hasSalon ? (
                                        // Registered but waiting approval
                                        <div className="dropdown-item" style={{ cursor: 'default', color: '#d97706' }}>
                                            <HiSparkles /> Pending Approval
                                        </div>
                                    ) : (
                                        // No salon yet (Customer/User)
                                        <Link to="/salon/register" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                                            <GoBriefcase /> Become a Partner
                                        </Link>
                                    )}

                                    <hr className="dropdown-divider" />

                                    <button onClick={handleLogout} className="dropdown-item btn-logout-item">
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="auth-buttons">
                            <Link to="/login" className="btn-text"><GoPerson /> Sign In</Link>
                            <Link to="/register" className="btn-primary">Sign Up</Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default HeaderHome;