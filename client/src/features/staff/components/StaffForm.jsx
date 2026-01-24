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
    const { registerStaff, isLoading, error, success } = useRegisterStaff();
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

        // Validation giống hệt RegisterForm
        if (password !== confirmPassword) {
            setLocalError('Mật khẩu không khớp');
            return;
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
            setLocalError('Số điện thoại phải có 10 chữ số và bắt đầu bằng 0');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            setLocalError('Mật khẩu cần ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt');
            return;
        }

        try {
            await registerStaff({ fullName, email, phone, password });
            // Thành công → thông báo và quay về dashboard
            setTimeout(() => {
                navigate('/salon/dashboard'); // hoặc '/salon/staff' nếu có trang danh sách
            }, 1500);
        } catch (err) {
            // Error đã được xử lý trong hook
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
                    placeholder="Họ và tên nhân viên"
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
                    placeholder="Email nhân viên"
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
                    placeholder="Số điện thoại"
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
                    placeholder="Mật khẩu"
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
                    placeholder="Xác nhận mật khẩu"
                    onChange={onChange}
                    required
                />
            </div>

            <div className="form-group">
                <button type="submit" className="btn" disabled={isLoading}>
                    {isLoading ? 'Đang thêm nhân viên...' : 'Thêm nhân viên'}
                </button>
            </div>
        </form>
    );
};

export default StaffForm;