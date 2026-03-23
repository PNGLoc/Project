import React, { useState, useEffect, useRef } from 'react';
import { FiBell } from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get('http://localhost:5000/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setNotifications(response.data.data);
                setUnreadCount(response.data.unreadCount);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 1 minute for new notifications
        const interval = setInterval(fetchNotifications, 60000);

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleRefresh = () => {
            fetchNotifications();
        };

        window.addEventListener('notifications_updated', handleRefresh);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            clearInterval(interval);
            window.removeEventListener('notifications_updated', handleRefresh);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`http://localhost:5000/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch('http://localhost:5000/api/notifications/read-all', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <div className="bell-trigger" onClick={() => setIsOpen(!isOpen)}>
                <FiBell size={22} />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </div>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllAsRead}>Mark all as read</button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length > 0 ? (
                            notifications.map((notif) => (
                                <div 
                                    key={notif._id} 
                                    className={`notification-item ${notif.isRead ? 'read' : 'unread'}`}
                                    onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                                >
                                    <h4 className="notif-title">{notif.title}</h4>
                                    <p className="notif-message">{notif.message}</p>
                                    <span className="notif-time">{formatTime(notif.createdAt)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="no-notifications">No notifications yet</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
