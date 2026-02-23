import React from 'react';
import { FiMapPin } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import '../../assets/css/SalonCard.css';
import { useFollow } from '../../features/social/hooks/useFollow';

const SalonCard = ({ data, onUnfollow }) => {
    const imageUrl = data?.images?.length > 0
        ? data.images[0]
        : "https://via.placeholder.com/300";

    const districtName = data.address?.district || "Hồ Chí Minh";

    const currentUser = (() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch {
            return null;
        }
    })();

    const isCustomer = currentUser?.role === 'CUSTOMER';

    const handleToggleCallback = (newIsFollowing) => {
        // Chỉ gọi callback khi unfollow (từ true -> false)
        if (!newIsFollowing && onUnfollow) {
            onUnfollow();
        }
    };

    const { isFollowing, loading, toggleFollow } = useFollow('SALON', data?._id, handleToggleCallback);

    const handleFollowClick = (e) => {
        e.stopPropagation();
        if (!isCustomer) return;

        // Nếu đang Following thì hỏi xác nhận trước khi bỏ follow
        if (isFollowing) {
            const ok = window.confirm('Bạn có chắc chắn muốn bỏ Follow salon này không?');
            if (!ok) return;
        }

        toggleFollow();
    };

    return (
        <div className="salon-card">
            <div className="salon-image">
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
                        <h3 className="salon-name">{data.name}</h3>
                        <p className="salon-type">Hair Salon & Spa</p>
                    </div>
                    {isCustomer && (
                        <button
                            className={`follow-btn ${isFollowing ? 'following' : ''}`}
                            onClick={handleFollowClick}
                            disabled={loading}
                        >
                            {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
                        </button>
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

                <button className="details-btn">View Details</button>
            </div>
        </div>
    );
};

export default SalonCard;