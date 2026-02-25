import React from 'react';
import { FiMapPin } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';
// import { MdVerified } from 'react-icons/md'; // Bạn đang dùng HiSparkles nên có thể bỏ dòng này nếu không cần
import { HiSparkles } from 'react-icons/hi';
import '../../assets/css/SalonCard.css';

const SalonCard = ({ data }) => {
    // 1. Lấy ảnh đầu tiên từ mảng images (xử lý an toàn)
    const imageUrl = data?.images?.length > 0
        ? data.images[0]
        : "https://via.placeholder.com/300";

    // 2. Xử lý hiển thị địa chỉ
    const districtName = data.address?.district || "Hồ Chí Minh";

    return (
        <div className="salon-card">
            {/* --- PHẦN ẢNH VÀ BADGE (ĐÃ SỬA LỖI LẶP) --- */}
            <div className="salon-image">
                <img src={imageUrl} alt={data.name} />

                {/* Nhãn Verified nằm đè lên ảnh */}
                {data.isApproved && (
                    <div className="verified-badge">
                        <HiSparkles className="verified-icon" />
                        <span>Verified</span>
                    </div>
                )}
            </div>

            {/* --- PHẦN THÔNG TIN --- */}
            <div className="salon-info">
                <div className="salon-header">
                    <h3 className="salon-name">{data.name}</h3>
                    <p className="salon-type">Hair Salon & Spa</p>
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