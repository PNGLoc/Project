import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const navigate = useNavigate();
    const { login, isLoading, error } = useLogin();

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = await login({ email, password });

            // Redirect based on Role
            if (userData.role === 'ADMIN') {
                navigate('/admin/dashboard');
            } else if (userData.role === 'SALON_OWNER') {
                navigate('/salon/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            // Error handled by hook
        }
    };

    return (
        <form onSubmit={onSubmit}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
                <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={email}
                    placeholder="Email Address"
                    onChange={(e) => setEmail(e.target.value)}
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
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </div>

            <div className="form-group" style={{ textAlign: 'right', marginBottom: '15px' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                    Forgot Password?
                </Link>
            </div>

            <div className="form-group">
                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? 'Logging In...' : 'Login'}
                </button>
            </div>
        </form>
    );
};

export default LoginForm;
