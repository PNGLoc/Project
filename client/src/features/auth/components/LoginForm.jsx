import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { GoogleLogin } from '@react-oauth/google';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const navigate = useNavigate();
    const { login, loginWithGoogle, isLoading, error } = useLogin();

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const userData = await loginWithGoogle(credentialResponse.credential);
            if (userData.role === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Google login error', err);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const userData = await login({ email, password });

            // Redirect based on Role
            if (userData.role === 'ADMIN') {
                navigate('/admin/dashboard');
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

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
                <span style={{ padding: '0 10px', color: '#64748b', fontSize: '0.875rem' }}>OR</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
            </div>

            <div className="form-group" style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => {
                        console.error('Google Login Failed');
                    }}
                    useOneTap
                    theme="outline"
                    width="100%"
                    locale="en_US"
                />
            </div>
        </form>
    );
};

export default LoginForm;
