import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useForgotPassword';

const ForgotPasswordForm = () => {
    const [email, setEmail] = useState('');
    const { forgotPassword, isLoading, error, success } = useForgotPassword();
    const navigate = useNavigate();

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            await forgotPassword(email);
            // Redirect to reset password page after short delay, passing email
            setTimeout(() => {
                navigate('/reset-password', { state: { email } });
            }, 1500);
        } catch (err) {
            // Error handled by hook
        }
    };

    return (
        <form onSubmit={onSubmit}>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
                <input
                    type="email"
                    className="form-control"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? 'Sending OTP...' : 'Send Reset Code'}
                </button>
            </div>
        </form>
    );
};

export default ForgotPasswordForm;
