import React, { useState, useEffect } from 'react';
import followApi from '../api/followApi';
import { FiUsers, FiMail, FiPhone, FiCalendar, FiClock } from 'react-icons/fi';
import '../../../assets/css/FollowersList.css';

const FollowersList = ({ onCountUpdate }) => {
    const [followers, setFollowers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [count, setCount] = useState(0);

    useEffect(() => {
        const fetchFollowers = async () => {
            try {
                setIsLoading(true);
                const data = await followApi.getFollowers();
                setFollowers(data.items || []);
                setCount(data.count || 0);
                if (onCountUpdate) onCountUpdate(data.count || 0);
                setError(null);
            } catch (err) {
                console.error('Error fetching followers:', err);
                setError('Failed to load followers');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFollowers();
    }, [onCountUpdate]);

    if (isLoading) return (
        <div className="followers-loading">
            <div className="spinner"></div>
            <p>Loading followers...</p>
        </div>
    );

    if (error) return (
        <div className="followers-error">
            <p>Error loading data. Please try again later.</p>
        </div>
    );

    return (
        <div className="followers-section">
            {followers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon-wrap">
                        <FiUsers />
                    </div>
                    <h3>No followers yet</h3>
                </div>
            ) : (
                <div className="followers-list-container">
                    <table className="followers-table">
                        <tbody>
                            {followers.map((follower) => (
                                <tr key={follower._id} className="follower-row">
                                    <td>
                                        <div className="user-profile-cell">
                                            <img
                                                src={follower.avatar || 'https://via.placeholder.com/150'}
                                                alt={follower.fullName}
                                            />
                                            <span className="user-name">{follower.fullName}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FollowersList;
