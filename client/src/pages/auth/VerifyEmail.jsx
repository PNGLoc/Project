import VerifyForm from '../../features/auth/components/VerifyForm';
import AuthLayout from '../../features/auth/components/AuthLayout';

function VerifyEmail() {
    return (
        <AuthLayout
            title="Verify Account"
            subtitle="We've sent a code to your email"
        >
            <VerifyForm />
        </AuthLayout>
    );
}

export default VerifyEmail;
