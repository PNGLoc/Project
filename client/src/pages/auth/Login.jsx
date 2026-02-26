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
