import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVerify } from '../hooks/useVerify';

const VerifyForm = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState(location.state ? location.state.email : '');
    const [otp, setOtp] = useState('');

    const { verify, isLoading, error, success } = useVerify();

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            await verify({ email, otp });
            setTimeout(() => navigate('/login'), 1500);
        } catch (err) {
            // Error is handled by hook
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
                    id="email"
                    name="email"
                    value={email}
                    placeholder="Confirm Email Address"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
            </div>
            <div className="form-group">
                <input
                    type="text"
                    className="form-control"
                    id="otp"
                    name="otp"
                    value={otp}
                    placeholder="Enter 6-digit Code"
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength="6"
                    required
                />
            </div>
            <div className="form-group">
                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? 'Verifying...' : 'Verify Account'}
                </button>
            </div>
        </form>
    );
};

export default VerifyForm;
