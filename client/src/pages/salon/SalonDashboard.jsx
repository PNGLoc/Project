import { useLogout } from '../../features/auth/hooks/useLogout';

const SalonDashboard = () => {
    const { logout } = useLogout();
    const user = JSON.parse(localStorage.getItem('user'));

    return (
        <div className="container" style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#00897b' }}>Salon Dashboard</h1>
                <button onClick={logout} className="btn" style={{ width: 'auto', backgroundColor: '#ef4444' }}>
                    Logout
                </button>
            </header>

            <div className="card">
                <h3>Welcome, Partner {user?.fullName}!</h3>
                <p>Manage your salon, staff, and bookings here.</p>
            </div>
        </div>
    );
};

export default SalonDashboard;
