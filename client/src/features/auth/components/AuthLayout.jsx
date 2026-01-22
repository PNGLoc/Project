import React from 'react';

const AuthLayout = ({ children, title, subtitle }) => {
    return (
        <div className="auth-page-wrapper" style={{ backgroundImage: `url('/assets/auth-bg.png')` }}>
            <div className="auth-card">
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
