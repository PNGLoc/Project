import AuthLayout from '../../features/auth/components/AuthLayout';
import ForgotPasswordForm from '../../features/auth/components/ForgotPasswordForm';
import { Link } from 'react-router-dom';

function ForgotPassword() {
    return (
        <AuthLayout
            title="RESET PASSWORD"
            subtitle="Enter your email to receive an OTP"
        >
            <ForgotPasswordForm />
            <div style={{ marginTop: '20px' }}>
                <p style={{ color: '#6b7280' }}>
                    Remember your password? <Link to="/login">Login</Link>
                </p>
            </div>
        </AuthLayout>
    );
}

export default ForgotPassword;
