import AuthLayout from '../../features/auth/components/AuthLayout';
import RegisterForm from '../../features/auth/components/RegisterForm';
import { Link } from 'react-router-dom';

function Register() {
    return (
        <AuthLayout
            title="CREATE ACCOUNT"
            subtitle="Join us for an exclusive experience"
        >
            <RegisterForm />
            <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#6b7280' }}>
                    Already have an account? <Link to="/login">Login</Link>
                </p>
            </div>
        </AuthLayout>
    );
}

export default Register;
