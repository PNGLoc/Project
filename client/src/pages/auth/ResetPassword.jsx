import AuthLayout from '../../features/auth/components/AuthLayout';
import ResetPasswordForm from '../../features/auth/components/ResetPasswordForm';

function ResetPassword() {
    return (
        <AuthLayout
            title="Create New Password"
            subtitle="Secure your account"
        >
            <ResetPasswordForm />
        </AuthLayout>
    );
}

export default ResetPassword;
