// client/src/components/SalonCard.tsx
import React from 'react';
import { Salon } from '../types';
import '../assets/css/SalonCard.css';
import { FiMapPin } from 'react-icons/fi';
import { FaStar } from 'react-icons/fa';

interface SalonCardProps {
    data: Salon;
}

const SalonCard: React.FC<SalonCardProps> = ({ data }) => {
    return (
        <div className="salon-card">
            <div className="salon-image">
                <img src={data.images[0] || "https://via.placeholder.com/300"} alt={data.name} />
            </div>
            <div className="salon-info">
                <h3 className="salon-name">{data.name}</h3>
                <p className="salon-address"><FiMapPin /> {data.address}</p>
                <div className="salon-rating"><FaStar color='#FFD700' /> {data.rating} / 5</div>
                <button className="details-btn">View Details</button>
            </div>
        </div>
    );
};

export default SalonCard;