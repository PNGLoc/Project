import React, { useState, useEffect } from 'react';
import FollowersList from '../../features/social/components/FollowersList';
import followApi from '../../features/social/api/followApi';
import { FiGrid, FiUsers, FiBarChart2, FiBell, FiArrowRight, FiInfo, FiLayers } from 'react-icons/fi';
import PartnerDashboard from './PartnerDashboard';
import '../../assets/css/Overview.css';

const Overview = ({ onTabChange }) => {
    const [activeSubTab, setActiveSubTab] = useState('none');
    const [followerCount, setFollowerCount] = useState(0);

    useEffect(() => {
        const fetchInitialCount = async () => {
            try {
                const data = await followApi.getFollowers();
                setFollowerCount(data.count || 0);
            } catch (err) {
                console.error('Error fetching initial follower count:', err);
            }
        };
        fetchInitialCount();
    }, []);

    const renderContent = () => {
        switch (activeSubTab) {
            case 'followers':
                return <FollowersList onCountUpdate={setFollowerCount} />;
            default:
                return <PartnerDashboard onNavigate={onTabChange} />;
        }
    };

    return (
        <div className="overview-page">

            {/* Main Feature Container with Sub-Nav */}
            <div className="feature-container">
                <nav className="mini-navbar">
                    <button
                        className={`sub-nav-btn ${activeSubTab === 'none' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('none')}
                    >
                        <FiBarChart2 />Overview
                    </button>
                    <button
                        className={`sub-nav-btn ${activeSubTab === 'followers' ? 'active' : ''}`}
                        onClick={() => setActiveSubTab('followers')}
                    >
                        <FiUsers /> Followers {followerCount > 0 && `(${followerCount})`}
                    </button>
                </nav>

                <div className="sub-content-area">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default Overview;
