// client/src/pages/salon/StaffRegistration.jsx
import { Link } from 'react-router-dom';
import AuthLayout from '../../features/auth/components/AuthLayout';
import StaffForm from '../../features/staff/components/StaffForm';


function StaffRegistration() {
    return (
        <>
          

            <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
                <AuthLayout
                    title="ADD NEW STAFF"
                    subtitle="Create an account for your salon staff member"
                >
                    <StaffForm />

                    <div style={{ marginTop: '30px', textAlign: 'center' }}>
                        <p style={{ color: '#6b7280', fontSize: '16px' }}>
                            <Link 
                                to="/salon/dashboard" 
                                style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}
                            >
                                ← Back to Dashboard
                            </Link>
                        </p>
                    </div>
                </AuthLayout>
            </div>
        </>
    );
}

export default StaffRegistration;