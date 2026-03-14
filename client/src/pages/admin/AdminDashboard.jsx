import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLogout } from '../../features/auth/hooks/useLogout';
import PendingApplications from './PendingApplications';
import '../../assets/css/AdminDashboard.css';
import { HiSparkles } from 'react-icons/hi';
import { FaDollarSign, FaStore, FaUsers, FaChartLine } from 'react-icons/fa';
import {
    AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const API_BASE = 'http://127.0.0.1:5000';

const PIE_COLORS = ['#0d9488', '#f472b6', '#f59e0b', '#818cf8', '#34d399'];

const StatCard = ({ icon, label, value, badge, badgeColor }) => (
    <div className="stat-card">
        <div className="stat-card-top">
            <span className="stat-icon">{icon}</span>
            {badge && <span className={`stat-badge stat-badge-${badgeColor || 'green'}`}>{badge}</span>}
        </div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
    </div>
);

const AdminDashboard = () => {
    const { logout } = useLogout();
    const user = JSON.parse(localStorage.getItem('user'));
    const location = useLocation();
    const isOverview = location.pathname === '/admin/dashboard';
    const isMyPosts = location.pathname === '/admin/my-posts';
    const isUsers = location.pathname === '/admin/users';
    const isReports = location.pathname === '/admin/reports';

    const [stats, setStats] = useState(null);
    const [charts, setCharts] = useState(null);
    const [activity, setActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                const [statsRes, chartsRes, activityRes] = await Promise.all([
                    fetch(`${API_BASE}/api/admin/stats`, { headers }),
                    fetch(`${API_BASE}/api/admin/charts`, { headers }),
                    fetch(`${API_BASE}/api/admin/activity`, { headers })
                ]);

                if (!statsRes.ok || !chartsRes.ok || !activityRes.ok) {
                    throw new Error('Failed to fetch dashboard data');
                }

                const [statsData, chartsData, activityData] = await Promise.all([
                    statsRes.json(), chartsRes.json(), activityRes.json()
                ]);

                setStats(statsData.data);
                setCharts(chartsData.data);
                setActivity(activityData.data);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const formatCurrency = (v) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v || 0);

    const formatNumber = (v) => (v || 0).toLocaleString();

    const getActivityColor = (type) => {
        switch (type) {
            case 'New Salon': return '#3b82f6';
            case 'Booking': return '#10b981';
            case 'User': return '#a855f7';
            default: return '#f59e0b';
        }
    };

    const timeAgo = (date) => {
        const s = Math.floor((Date.now() - new Date(date)) / 1000);
        if (s < 60) return `${s}s ago`;
        if (s < 3600) return `${Math.floor(s / 60)} min ago`;
        if (s < 86400) return `${Math.floor(s / 3600)} hour${Math.floor(s / 3600) > 1 ? 's' : ''} ago`;
        return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? 's' : ''} ago`;
    };

    const RADIAN = Math.PI / 180;
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }) => {
        const r = outerRadius + 24;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                {`${name} ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="admin-wrapper">
            <header className="admin-header">
                <div className="header-container">
                    <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                        <div className="logo-section">
                            <HiSparkles size={24} color="#0d9488" />
                            <span>SalonHub</span>
                        </div>
                        <nav className="header-nav">
                            <Link className={`nav-link ${isOverview ? 'active' : ''}`} to="/admin/dashboard">Overview</Link>
                            <Link className={`nav-link ${isMyPosts ? 'active' : ''}`} to="/admin/my-posts">My Posts</Link>
                            <Link className={`nav-link ${isUsers ? 'active' : ''}`} to="/admin/users">Users</Link>
                            <Link className={`nav-link ${isReports ? 'active' : ''}`} to="/admin/reports">Reports</Link>
                        </nav>
                    </div>
                    <div className="header-right">
                        <div className="user-controls">
                            <button className="btn-sign-in">{user?.fullName || 'Admin'}</button>
                            <button className="btn-get-started" onClick={logout}>Logout</button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="admin-content-full">
                <div className="page-inner">
                    <div className="dynamic-header">
                        <h1>Platform Overview</h1>
                        <p>Monitor and manage the SalonHub marketplace</p>
                    </div>

                    {error && (
                        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: 8, margin: '16px 0' }}>
                            Error loading data: {error}
                        </div>
                    )}

                    {/* STAT CARDS */}
                    {loading ? (
                        <div className="stats-grid">
                            {[1, 2, 3, 4].map(i => <div key={i} className="stat-card stat-card-skeleton" />)}
                        </div>
                    ) : (
                        <div className="stats-grid">
                            <StatCard
                                icon={<FaDollarSign size={22} color="#0d9488" />}
                                label="Total Revenue"
                                value={formatCurrency(stats?.totalRevenue)}
                                badgeColor="green"
                            />
                            <StatCard
                                icon={<FaStore size={20} color="#f59e0b" />}
                                label="Active Salons"
                                value={formatNumber(stats?.activeSalons)}
                                badgeColor="green"
                            />
                            <StatCard
                                icon={<FaUsers size={20} color="#f59e0b" />}
                                label="Total Users"
                                value={formatNumber(stats?.totalUsers)}
                                badgeColor="green"
                            />
                            <StatCard
                                icon={<FaChartLine size={20} color="#0d9488" />}
                                label="Platform Growth"
                                value={stats?.platformGrowth >= 0 ? `+${stats?.platformGrowth}%` : `${stats?.platformGrowth}%`}
                                badge="This month"
                                badgeColor="green"
                            />
                        </div>
                    )}

                    {/* CHARTS ROW 1 */}
                    <div className="charts-row">
                        {/* Revenue Area Chart */}
                        <div className="chart-card chart-card-wide">
                            <h3 className="chart-title">Platform Revenue & Commission</h3>
                            {loading ? <div className="chart-skeleton" /> : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <AreaChart data={charts?.revenueData || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.7} />
                                                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.2} />
                                            </linearGradient>
                                            <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ca8a04" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#ca8a04" stopOpacity={0.3} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(v) => v.toLocaleString()} />
                                        <Area type="monotone" dataKey="revenue" stroke="#0d9488" fill="url(#colorRev)" strokeWidth={2} name="Revenue" />
                                        <Area type="monotone" dataKey="commission" stroke="#ca8a04" fill="url(#colorComm)" strokeWidth={2} name="Commission" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Pie Chart */}
                        <div className="chart-card chart-card-narrow">
                            <h3 className="chart-title">User Roles Distribution</h3>
                            {loading ? <div className="chart-skeleton" /> : (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={stats?.userRoles?.length > 0 ? stats.userRoles : [{ name: 'No Data', value: 1 }]}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            dataKey="value"
                                            label={renderCustomLabel}
                                            labelLine={true}
                                        >
                                            {(stats?.userRoles || [{ name: 'No Data', value: 1 }]).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* CHARTS ROW 2 */}
                    <div className="charts-row">
                        {/* User Growth Line Chart */}
                        <div className="chart-card chart-card-wide">
                            <h3 className="chart-title">User Growth</h3>
                            {loading ? <div className="chart-skeleton" /> : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <LineChart data={charts?.userGrowthData || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                        <YAxis tick={{ fontSize: 12 }} />
                                        <Tooltip formatter={(v) => v.toLocaleString()} />
                                        <Line type="monotone" dataKey="users" stroke="#f472b6" strokeWidth={2} dot={{ r: 4, fill: '#f472b6' }} name="Total Users" />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Recent Activity */}
                        <div className="chart-card chart-card-narrow">
                            <h3 className="chart-title">Recent Activity</h3>
                            {loading ? <div className="chart-skeleton" /> : (
                                <div className="activity-list">
                                    {activity.length === 0 ? (
                                        <p style={{ color: '#6b7280', fontSize: 13 }}>No recent activity.</p>
                                    ) : activity.map((act, i) => (
                                        <div key={i} className="activity-item">
                                            <span className="activity-dot" style={{ background: getActivityColor(act.type) }} />
                                            <div className="activity-body">
                                                <div className="activity-top">
                                                    <span className="activity-tag" style={{ background: getActivityColor(act.type) + '22', color: getActivityColor(act.type) }}>
                                                        {act.type}
                                                    </span>
                                                    <span className="activity-time">{timeAgo(act.time)}</span>
                                                </div>
                                                <p className="activity-message">{act.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending Applications Table */}
                    <div className="section-divider" />
                    <div className="content-render-area">
                        <PendingApplications />
                    </div>

                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;