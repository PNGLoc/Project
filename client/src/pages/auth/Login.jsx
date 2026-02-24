import AuthLayout from '../../features/auth/components/AuthLayout';
import LoginForm from '../../features/auth/components/LoginForm';
import { Link, useLocation } from 'react-router-dom';

function Login() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const sessionExpired = queryParams.get('session_expired') === 'true';

    return (
        <AuthLayout
            title="WELCOME BACK"
            subtitle="Please login to your account"
        >
            {sessionExpired && (
                <div style={{
                    backgroundColor: '#fee2e2',
                    color: '#b91c1c',
                    padding: '10px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    border: '1px solid #fca5a5'
                }}>
                    Your session has expired. Please log in again.
                </div>
            )}
            <LoginForm />
            <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#6b7280' }}>
                    Don't have an account? <Link to="/register">Sign Up</Link>
                </p>
            </div>
        </AuthLayout>
    );
}

export default Login;
