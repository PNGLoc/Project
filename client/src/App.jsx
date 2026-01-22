import HomePage from './pages/HomePage';
import AppRoutes from './routes/AppRoutes';
import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import Login from './pages/auth/Login';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import ProtectedRoute from './components/layout/ProtectedRoute';
import SalonDashboard from './pages/salon/SalonDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import Header from './components/layout/Header';

function App() {
  const [count, setCount] = useState(0)
  return (
    <>
      <AppRoutes />
      <Router>
        <Header />
        <div className='container'>
          <Routes>

            <Route path='/forgot-password' element={<ForgotPassword />} />
            <Route path='/reset-password' element={<ResetPassword />} />

            <Route path='/verify-email' element={<VerifyEmail />} />

            {/* Public Home */}
            <Route path='/' element={
              <div className="text-center">
                <h2>Welcome to Project WDP301</h2>
                <div style={{ marginTop: '20px' }}>
                  <p>Please <a href="/login">Login</a> or <a href="/register">Register</a> to continue</p>
                </div>
              </div>
            } />


            {/* CUSTOMER Routes */}
            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
              <Route path='/users/profile' element={<h2>User Profile (Placeholder)</h2>} />
            </Route>

            {/* SALON OWNER Routes */}
            <Route element={<ProtectedRoute allowedRoles={['SALON_OWNER']} />}>
              <Route path='/salon/dashboard' element={<SalonDashboard />} />
              <Route path='/salon/manage' element={<h2>Manage Salon (Placeholder)</h2>} />
            </Route>

            {/* ADMIN Routes */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path='/admin/dashboard' element={<AdminDashboard />} />
              <Route path='/admin/users' element={<h2>Manage Users (Placeholder)</h2>} />
            </Route>

          </Routes>
        </div>
      </Router>
    </>

  );
}

export default App;

{/* <div>
  <HomePage />
  <AppRoutes />
</div> */}