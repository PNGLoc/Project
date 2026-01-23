import { Link, useNavigate } from 'react-router-dom';
import { useLogout } from '../../features/auth/hooks/useLogout';
import { FiBookOpen } from 'react-icons/fi';

const Header = () => {
    const navigate = useNavigate();
    const { logout } = useLogout();
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    return (
        <nav className="header">
            <div className="header-container">
                <Link to="/" className="header-logo">
                    SalonHub
                </Link>

                <div className="header-links">
                    {user ? (
                        <>
                            {/* Role-specific Dashboard Links */}
                            {user.role === 'ADMIN' && (
                                <Link to="/admin/dashboard" className="header-link">Admin Panel</Link>
                            )}
                            {user.role === 'SALON_OWNER' && (
                                <Link to="/salon/dashboard" className="header-link">My Salon</Link>
                            )}
                            {user.role === 'CUSTOMER' && (
                                <Link to="/users/profile" className="header-link">My Profile</Link>
                            )}

                            <Link to="/blog/my-blogs" className="header-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                <FiBookOpen /> My Blogs
                            </Link>

                            <span className="header-user-info">
                                Hi, {user.fullName.split(' ')[0]} ({user.role})
                            </span>

                            <button onClick={logout} className="header-btn-logout">
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className="header-link">Login</Link>
                            <Link to="/register" className="header-btn-register">Sign Up</Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Header;
