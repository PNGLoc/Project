import React, { useState } from 'react';
import { FiMapPin } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { MessageCircle } from 'lucide-react';
import '../../assets/css/SalonCard.css';
import ConfirmModal from '../ui/ConfirmModal';
import { useFollow } from '../../features/social/hooks/useFollow';
import { useNavigate } from 'react-router-dom';

const SalonCard = ({ data, onUnfollow, showChatButton = true }) => {
    const imageUrl = data?.images?.length > 0
        ? data.images[0]
        : "https://via.placeholder.com/300";

    const districtName = data.address?.district || "Hồ Chí Minh";

    // --- PHẦN XỬ LÝ HIỂN THỊ CATEGORY ĐỘNG ---
    // data.categories được Backend (salonController) trả về dưới dạng mảng ["Hair", "Nails"]
    const categoryDisplay = data.categories && data.categories.length > 0
        ? data.categories.join(' & ')
        : "Beauty Salon";

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    })();

    const isCustomer = currentUser?.role === 'CUSTOMER';

    const handleToggleCallback = (newIsFollowing) => {
        if (!newIsFollowing && onUnfollow) {
            onUnfollow();
        }
    };

    const { isFollowing, loading, toggleFollow } = useFollow('SALON', data?._id, handleToggleCallback);

    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleChatClick = (e) => {
        e.stopPropagation();
        if (!isCustomer) {
            navigate('/login');
            return;
        }
        // Trigger custom event to open chat in HomePage
        const event = new CustomEvent('openChatWithSalon', { 
            detail: { salonId: data._id } 
        });
        window.dispatchEvent(event);
    };

    const handleFollowClick = (e) => {
        e.stopPropagation();
        if (!isCustomer) return;

        if (isFollowing) {
            setIsConfirmOpen(true);
        } else {
            toggleFollow();
        }
    };

    const confirmUnfollow = () => {
        setIsConfirmOpen(false);
        toggleFollow();
    };

    const navigate = useNavigate();

    const handleDetailsClick = () => {
        if (data?._id) {
            navigate(`/salon/${data._id}`);
        }
    };

    return (
        <div className="salon-card">
            <div className="salon-image" onClick={handleDetailsClick} style={{ cursor: 'pointer' }}>
                <img src={imageUrl} alt={data.name} />

                {data.isApproved && (
                    <div className="verified-badge">
                        <HiSparkles className="verified-icon" />
                        <span>Verified</span>
                    </div>
                )}
            </div>

            <div className="salon-info">
                <div className="salon-header-row">
                    <div className="salon-header">
                        <h3 className="salon-name" onClick={handleDetailsClick} style={{ cursor: 'pointer' }}>{data.name}</h3>

                        {/* THAY ĐỔI TẠI ĐÂY: Hiển thị danh mục động */}
                        <p className="salon-type">{categoryDisplay}</p>
                    </div>
                    {isCustomer && showChatButton && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="chat-btn"
                                onClick={handleChatClick}
                                title="Chat with salon"
                            >
                                <MessageCircle size={16} />
                            </button>
                            <button
                                className={`follow-btn ${isFollowing ? 'following' : ''}`}
                                onClick={handleFollowClick}
                                disabled={loading}
                            >
                                {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="salon-stats">
                    <div className="stat-item rating">
                        <FaStar className="star-icon" color="#FFD700" />
                        <span className="score"> {data.rating || 5.0}</span>
                        <span className="count"> ({data.reviews || 0})</span>
                    </div>
                    <div className="stat-item location">
                        <FiMapPin className="loc-icon" />
                        <span> {districtName}</span>
                    </div>
                </div>

                <button className="details-btn" onClick={handleDetailsClick}>Book Now</button>
            </div>

            <ConfirmModal
                isOpen={isConfirmOpen}
                title="Unfollow Salon"
                message={`Are you sure you want to stop following "${data.name}"?`}
                onConfirm={confirmUnfollow}
                onCancel={() => setIsConfirmOpen(false)}
                confirmText="Unfollow"
                type="danger"
            />
        </div>
    );
};

export default SalonCard;