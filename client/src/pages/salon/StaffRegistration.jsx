// src/pages/salon/StaffRegistration.jsx
import AuthLayout from '../../features/auth/components/AuthLayout';
import StaffForm from '../../features/staff/components/StaffForm';
import { Link } from 'react-router-dom';

function StaffRegistration() {
    return (
        <AuthLayout
            title="THÊM NHÂN VIÊN"
            subtitle="Tạo tài khoản cho nhân viên salon của bạn"
        >
            <StaffForm />
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <p style={{ color: '#6b7280' }}>
                    <Link to="/salon/dashboard">← Quay lại Dashboard</Link>
                </p>
            </div>
        </AuthLayout>
    );
}

export default StaffRegistration;