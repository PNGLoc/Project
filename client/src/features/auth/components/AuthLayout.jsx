import React from 'react';
import { Link } from 'react-router-dom';
import { HiSparkles } from 'react-icons/hi';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="auth-page-wrapper" style={{ backgroundImage: `url('/assets/auth-bg.png')` }}>
            <div className="auth-card">
                <Link to="/" className="logo-section" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <HiSparkles size={24} color="#0d9488" />
                    <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: '#111827' }}>SalonHub</span>
                </Link>
                <section className="heading">
                    <h1>{title}</h1>
                    {subtitle && <p>{subtitle}</p>}
                </section>
                {children}
            </div>
        </div>
    );
};

export default AuthLayout;
