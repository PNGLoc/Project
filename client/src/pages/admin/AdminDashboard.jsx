import { useLogout } from '../../features/auth/hooks/useLogout';

const AdminDashboard = () => {
    const { logout } = useLogout();
    const user = JSON.parse(localStorage.getItem('user'));

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#111827' }}>Admin Dashboard</h1>
                <button onClick={logout} className="btn" style={{ width: 'auto', backgroundColor: '#ef4444' }}>
                    Logout
                </button>
            </header>

            <div className="card">
                <h3>Admin Panel</h3>
                <p>Welcome, {user?.fullName}. You have full system access.</p>
            </div>
        </div>
    );
};

export default AdminDashboard;
