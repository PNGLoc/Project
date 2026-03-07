import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Calendar,
    Users,
    DollarSign,
    Clock,
    Star,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import axiosClient from '../../lib/axios';
import '../../assets/css/PartnerDashboard.css';

export function PartnerDashboard({ onNavigate }) {
    const [isLoading, setIsLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        stats: null,
        revenueData: [],
        bookingsData: [],
        todaySchedule: [],
        topServices: []
    });

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const response = await axiosClient.get('/api/salons/dashboard/stats');
                if (response.data && response.data.success) {
                    setDashboardData(response.data.data);
                }
            } catch (error) {
                console.error("Error fetching dashboard stats:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const { stats, revenueData, bookingsData, todaySchedule, topServices } = dashboardData;

    if (isLoading || !stats) {
        return (
            <div className="partner-dashboard flex items-center justify-center min-h-[400px]">
                <div className="text-center text-muted-foreground">
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Total Revenue',
            value: `$${stats.totalRevenue.toLocaleString()}`,
            change: '+0%', // Placeholder trend
            trend: 'up',
            icon: DollarSign,
            color: 'text-primary-svg',
        },
        {
            title: 'Total Bookings',
            value: stats.totalBookings.toLocaleString(),
            change: '+0%', // Placeholder trend
            trend: 'up',
            icon: Calendar,
            color: 'text-secondary-svg',
        },
        {
            title: 'New Customers (30d)',
            value: stats.newCustomers.toLocaleString(),
            change: '+0%', // Placeholder trend
            trend: 'up',
            icon: Users,
            color: 'text-accent-svg',
        },
        {
            title: 'Avg Rating',
            value: stats.avgRating,
            change: '+0.0', // Placeholder trend
            trend: 'up',
            icon: Star,
            color: 'text-accent-svg',
        },
    ];

    return (
        <div className="partner-dashboard">
            <div className="dashboard-wrapper">

                {/* Stats Grid */}
                <div className="stats-grid">
                    {statCards.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.title} className="dash-card">
                                <div className="stat-header">
                                    <div className={`stat-icon ${stat.color}`}>
                                        <Icon />
                                    </div>
                                    <span className={`dash-badge ${stat.trend === 'up' ? 'badge-up' : 'badge-down'}`}>
                                        {stat.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {stat.change}
                                    </span>
                                </div>
                                <div className="stat-info">
                                    <p>{stat.title}</p>
                                    <p className="stat-value">{stat.value}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Charts Grid */}
                <div className="charts-grid">
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Weekly Revenue</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `$${value}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value) => [`$${value}`, 'Revenue']}
                                />
                                <Line type="monotone" dataKey="revenue" stroke="var(--primary-color, #00897b)" strokeWidth={3} dot={{ r: 4, fill: '#00897b' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Weekly Bookings</h3>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={bookingsData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="bookings" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Details Grid (Schedule + Top Services) */}
                <div className="details-grid">
                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Today's Schedule</h3>
                            <button className="dash-btn dash-btn-sm" onClick={() => onNavigate('calendar')}>
                                <Calendar size={16} />
                                View Calendar
                            </button>
                        </div>

                        <div className="schedule-list">
                            {todaySchedule.length === 0 ? (
                                <p className="text-center text-muted text-sm py-4">No appointments scheduled for today.</p>
                            ) : (
                                todaySchedule.map((appointment) => (
                                    <div key={appointment.id} className="schedule-item">
                                        <div className="schedule-time">
                                            <Clock size={20} />
                                            <p>{appointment.time}</p>
                                            <p>{appointment.duration}</p>
                                        </div>

                                        <div className="schedule-details">
                                            <div className="schedule-header">
                                                <h4>{appointment.customer}</h4>
                                                <span className={`dash-badge badge-${appointment.status}`}>
                                                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                                                </span>
                                            </div>
                                            <p className="schedule-service">{appointment.service}</p>
                                            <p className="schedule-stylist">with {appointment.stylist}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="dash-card">
                        <div className="dash-card-header">
                            <h3 className="dash-card-title">Top Services</h3>
                        </div>

                        <div className="services-list">
                            {topServices.length === 0 ? (
                                <p className="text-center text-muted text-sm py-4">No completed services yet.</p>
                            ) : (
                                topServices.map((service, idx) => (
                                    <div key={service.name} className="service-item">
                                        <div className="service-header">
                                            <div className="service-rank-name">
                                                <div className="service-rank">{idx + 1}</div>
                                                <span className="service-name">{service.name}</span>
                                            </div>
                                        </div>
                                        <div className="service-stats">
                                            <span className="service-bookings">{service.bookings} bookings</span>
                                            <span className="service-revenue">${service.revenue.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div >
        </div >
    );
}

export default PartnerDashboard;
