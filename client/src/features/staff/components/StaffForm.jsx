// src/features/staff/components/StaffForm.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegisterStaff } from '../hooks/useRegisterStaff';

const StaffForm = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    const { fullName, email, phone, password, confirmPassword } = formData;

    const navigate = useNavigate();
    const { registerStaff, isLoading, error } = useRegisterStaff();
    const [localError, setLocalError] = useState('');

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setLocalError(''); // Xóa lỗi khi người dùng bắt đầu sửa
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        // Validate Full Name
        if (!fullName.trim()) {
            setLocalError('Full name is required.');
            return;
        }

        // Validate Email
        if (!email.trim()) {
            setLocalError('Email address is required.');
            return;
        }

        // Validate Password
        if (!password) {
            setLocalError('Password is required.');
            return;
        }

        if (password.length < 6) {
            setLocalError('Password must be at least 6 characters long.');
            return;
        }

        // Validate Confirm Password
        if (password !== confirmPassword) {
            setLocalError('Passwords do not match.');
            return;
        }

        // Validate Phone (optional nhưng nếu nhập thì phải đúng định dạng VN: bắt đầu bằng 0, 10 số)
        if (phone && !/^0\d{9}$/.test(phone.trim())) {
            setLocalError('Phone number must start with 0 and contain exactly 10 digits (e.g. 0901234567).');
            return;
        }

        try {
            await registerStaff({
                fullName: fullName.trim(),
                email: email.trim(),
                phone: phone.trim(),
                password
            });

            alert('Staff added successfully! Login credentials have been sent to their email.');
            navigate('/salon/staff-list');
        } catch (err) {
            // Error từ server sẽ được hook xử lý và trả về trong `error`
            // Không cần làm gì thêm ở đây
        }
    };

    const displayError = error || localError;

    return (
        <form onSubmit={onSubmit}>
            {/* Hiển thị lỗi */}
            {displayError && (
                <div style={{
                    background: '#fee2e2',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '14px',
                    border: '1px solid #fecaca'
                }}>
                    {displayError}
                </div>
            )}

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <input
                    type="text"
                    name="fullName"
                    value={fullName}
                    onChange={onChange}
                    placeholder="Full Name"
                    required
                    className="form-control"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '16px'
                    }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={onChange}
                    placeholder="Email Address"
                    required
                    className="form-control"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '16px'
                    }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <input
                    type="tel"
                    name="phone"
                    value={phone}
                    onChange={onChange}
                    placeholder="Phone Number (optional, e.g. 0901234567)"
                    className="form-control"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '16px'
                    }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
                <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={onChange}
                    placeholder="Password"
                    required
                    className="form-control"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '16px'
                    }}
                />
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
                <input
                    type="password"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={onChange}
                    placeholder="Confirm Password"
                    required
                    className="form-control"
                    style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '16px'
                    }}
                />
            </div>

            <div className="form-group">
                <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: '#000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    {isLoading ? 'Adding Staff...' : 'Add Staff'}
                </button>
            </div>
        </form>
    );
};

export default StaffForm;