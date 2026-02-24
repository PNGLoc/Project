import React from 'react';
import { FiMapPin } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import '../../assets/css/SalonCard.css';
import { useFollow } from '../../features/social/hooks/useFollow';
import { useNavigate } from 'react-router-dom';

const SalonCard = ({ data, onUnfollow }) => {
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

    const handleFollowClick = (e) => {
        e.stopPropagation();
        if (!isCustomer) return;

        if (isFollowing) {
            const ok = window.confirm('Bạn có chắc chắn muốn bỏ Follow salon này không?');
            if (!ok) return;
        }

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
            <div className="salon-image" onClick={handleDetailsClick} style={{cursor:'pointer'}}>
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
                        <h3 className="salon-name" onClick={handleDetailsClick} style={{cursor:'pointer'}}>{data.name}</h3>
                        
                        {/* THAY ĐỔI TẠI ĐÂY: Hiển thị danh mục động */}
                        <p className="salon-type">{categoryDisplay}</p>
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

                <button className="details-btn" onClick={handleDetailsClick}>View Details</button>
            </div>
        </div>
    );
};

export default SalonCard;