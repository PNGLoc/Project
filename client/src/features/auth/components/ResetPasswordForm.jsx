import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useResetPassword } from '../hooks/useResetPassword';

const ResetPasswordForm = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        email: location.state?.email || '',
        otp: '',
        newPassword: '',
        confirmPassword: '',
    });
    const { email, otp, newPassword, confirmPassword } = formData;

    const { resetPassword, isLoading, error, success } = useResetPassword();
    const [localError, setLocalError] = useState('');

    const onChange = (e) => {
        setFormData((prevState) => ({
            ...prevState,
            [e.target.name]: e.target.value,
        }));
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (newPassword !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        try {
            await resetPassword({ email, otp, newPassword });
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            // Error handled by hook
        }
    };

    return (
        <form onSubmit={onSubmit}>
            {(error || localError) && <div className="error-message">{error || localError}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
                <input
                    type="email"
                    className="form-control"
                    name="email"
                    value={email}
                    placeholder="Email Address"
                    onChange={onChange}
                    required
                    readOnly={!!location.state?.email} // Read only if passed from previous page
                />
            </div>

            <div className="form-group">
                <input
                    type="text"
                    className="form-control"
                    name="otp"
                    value={otp}
                    placeholder="Enter 6-digit OTP"
                    onChange={onChange}
                    required
                    maxLength="6"
                />
            </div>

            <div className="form-group">
                <input
                    type="password"
                    className="form-control"
                    name="newPassword"
                    value={newPassword}
                    placeholder="New Password"
                    onChange={onChange}
                    required
                    minLength="6"
                />
            </div>

            <div className="form-group">
                <input
                    type="password"
                    className="form-control"
                    name="confirmPassword"
                    value={confirmPassword}
                    placeholder="Confirm New Password"
                    onChange={onChange}
                    required
                />
            </div>

            <div className="form-group">
                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                </button>
            </div>
        </form>
    );
};

export default ResetPasswordForm;
