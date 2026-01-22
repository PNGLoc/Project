import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';

const RegisterForm = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });
    const { fullName, email, phone, password, confirmPassword } = formData;

    const navigate = useNavigate();
    const { register, isLoading, error, success } = useRegister();
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

        // Client-side validations
        if (password !== confirmPassword) {
            setLocalError('Passwords do not match');
            return;
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            setLocalError('Phone number must be 10 digits and start with 0');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            setLocalError('Password must be 8+ characters, with uppercase, lowercase, number, and symbol');
            return;
        }

        try {
            await register({ fullName, email, password, phone });
            setTimeout(() => navigate('/verify-email', { state: { email: email } }), 1500);
        } catch (err) {
            // Error is handled by the hook
        }
    };

    return (
        <form onSubmit={onSubmit}>
            {(error || localError) && <div className="error-message">{error || localError}</div>}
            {success && <div className="success-message">{success}</div>}

            <div className="form-group">
                <input
                    type="text"
                    className="form-control"
                    id="fullName"
                    name="fullName"
                    value={fullName}
                    placeholder="Full Name"
                    onChange={onChange}
                    required
                />
            </div>
            <div className="form-group">
                <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={email}
                    placeholder="Email Address"
                    onChange={onChange}
                    required
                />
            </div>
            <div className="form-group">
                <input
                    type="text"
                    className="form-control"
                    id="phone"
                    name="phone"
                    value={phone}
                    placeholder="Phone Number (e.g. 0912345678)"
                    onChange={onChange}
                    required
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    className="form-control"
                    id="password"
                    name="password"
                    value={password}
                    placeholder="Password"
                    onChange={onChange}
                    required
                />
            </div>
            <div className="form-group">
                <input
                    type="password"
                    className="form-control"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    placeholder="Confirm Password"
                    onChange={onChange}
                    required
                />
            </div>
            <div className="form-group">
                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </div>
        </form>
    );
};

export default RegisterForm;
