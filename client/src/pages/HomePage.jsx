import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import '../assets/css/HomePage.css';
import SalonCard from '../components/salon/SalonCard';
import { FiSearch, FiScissors, FiMapPin } from 'react-icons/fi';
import { FaSpa, FaFire } from 'react-icons/fa';
import { GiFingernail, GiLipstick } from 'react-icons/gi';
import { TbMassage } from 'react-icons/tb';
import { MdFaceRetouchingNatural } from 'react-icons/md';
import HeaderHome from "../components/layout/HeaderHome";
import axios from 'axios';
import { HiSparkles } from 'react-icons/hi';
import BlogSection from '../components/home/BlogSection';

const HomePage = () => {

    const userString = localStorage.getItem('user'); // 1. Lấy chuỗi thô


    // 1. Dữ liệu Categories 
    const categories = [
        { id: 1, name: 'Hair', icon: <FiScissors size={32} color="#f87171" /> },
        { id: 2, name: 'Nails', icon: <GiFingernail size={32} color="#fbbf24" /> },
        { id: 3, name: 'Spa', icon: <FaSpa size={32} color="#a78bfa" /> },
        { id: 4, name: 'Massage', icon: <TbMassage size={32} color="#fb923c" /> },
        { id: 5, name: 'Facial', icon: <MdFaceRetouchingNatural size={32} color="#f472b6" /> },
        { id: 6, name: 'Makeup', icon: <GiLipstick size={32} color="#e11d48" /> },
    ];

    // 3. Khởi tạo state (Dùng JS thuần không cần khai báo kiểu dữ liệu)
    const [salons, setSalons] = useState([]); // Mặc định là mảng rỗng
    const [loading, setLoading] = useState(true); // Mặc định là đang tải

    // 4. Hàm gọi API từ Backend
    useEffect(() => {
        const fetchSalons = async () => {
            try {
                // Thay URL bằng endpoint API thật của bạn
                const response = await axios.get('http://localhost:5000/api/salons');
                setSalons(response.data);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching salons:", error);
                setLoading(false);
            }
        };

        fetchSalons();
    }, []);


    return (
        <>
            {/* Header and home-container moved to MainLayout */}

            {/* --- PHẦN 2: BANNER (Tìm kiếm) --- */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Discover Your Perfect<br /><span className="highlight">Beauty Experience</span></h1>
                    <p>Connect with top-rated salons, spas, and stylists in your area</p>

                    <div className="search-bar">
                        <FiSearch className="search-icon" />
                        <input type="text" placeholder="Search for services, salons..." />
                        <button>Search</button>
                    </div>

                    <div className="quick-tags">
                        <span className="tag"><FiMapPin /> Near Me</span>
                        <span className="tag"><HiSparkles /> AI Reccommendations</span>
                    </div>
                </div>
            </section>

            {/* --- PHẦN 2.5: BLOG/NEWS --- */}
            <BlogSection />

            {/* --- PHẦN 3: CATEGORY --- */}
            <section className="section-container">
                <div className="section-header">
                    <h2 className="section-title">Browse by Category</h2>
                </div>

                <div className="category-grid">
                    {categories.map((item) => (
                        <Link
                            key={item.id}
                            to={`/category/${item.name.toLowerCase()}`}
                            className="cat-card"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <div className="cat-icon-wrapper">
                                {item.icon}
                            </div>
                            <h3 className="cat-card-title">{item.name}</h3>
                        </Link>
                    ))}
                </div>
            </section>

            {/* --- PHẦN 5: SALON  --- */}

            <div className="section-container">
                <div className="section-header">
                    <h2 className="section-title">Top Rated Salon</h2>
                </div>

                {loading ? (
                    <div className="loading-spinner">Loading awesome salons...</div>
                ) : (
                    <div className="salon-grid">
                        {salons.length > 0 ? (
                            // 1. Sắp xếp rating từ cao xuống thấp (b - a)
                            // 2. Cắt lấy 4 phần tử đầu tiên
                            salons
                                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                                .slice(0, 3)
                                .map((salon) => (
                                    <SalonCard
                                        key={salon._id}
                                        data={salon}
                                    />
                                ))
                        ) : (
                            <p>No salons found in your area.</p>
                        )}
                    </div>
                )}
            </div>

        </>
    );
};

export default HomePage;


{/* --- PHẦN FLASH SALE --- */ }
{/* <section className="bg-gray">
                <section className="section-container">
                    <div className="section-header">
                        <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <FiTrendingUp color="#ef4444" />
                            Flash Sale
                        </h2>
                        <a href="#" className="view-all">View All &rarr;</a>
                    </div>

                    <div className="flash-sale-grid">
                        {flashSaleItems.map((item) => (
                            <div key={item.id} className="flash-card">
                                <div className="flash-card-header">
                                    <h3 className="flash-service-name">{item.service}</h3>
                                    <div className="flash-timer">
                                        <FiClock size={14} />
                                        <span>{item.timeLeft}</span>
                                    </div>
                                </div>

                                <p className="flash-shop-name">{item.shop}</p>

                                <div className="flash-price-row">
                                    <span className="current-price">${item.price}</span>
                                    <span className="old-price">${item.originalPrice}</span>
                                    <span className="discount-tag">{item.discount}</span>
                                </div>

                                <button className="btn-book-now">Book Now</button>
                            </div>
                        ))}
                    </div>
                </section>
            </section> */}