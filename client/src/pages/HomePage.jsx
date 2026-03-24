import { Link, useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import '../assets/css/HomePage.css';
import SalonCard from '../components/salon/SalonCard';
import { FiSearch, FiScissors, FiMapPin, FiTrendingUp, FiClock } from 'react-icons/fi';
import { FaSpa, FaFire } from 'react-icons/fa';
import { GiFingernail, GiLipstick } from 'react-icons/gi';
import { TbMassage } from 'react-icons/tb';
import { MdFaceRetouchingNatural } from 'react-icons/md';
import HeaderHome from "../components/layout/HeaderHome";
import axios from 'axios';
import { HiSparkles, HiTicket } from 'react-icons/hi';
import ChatWidget from '../components/chat/ChatWidget';
import { MessageCircle } from 'lucide-react';


const HomePage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
        } else {
            navigate('/search');
        }
    };

    const CountdownTimer = ({ endTime }) => {
        const [timeLeft, setTimeLeft] = useState('');

        useEffect(() => {
            const calculateTimeLeft = () => {
                const diff = new Date(endTime) - new Date();
                if (diff > 0) {
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    const m = Math.floor((diff / 1000 / 60) % 60);
                    setTimeLeft(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
                } else {
                    setTimeLeft('Expired');
                }
            };
            calculateTimeLeft();
            const timer = setInterval(calculateTimeLeft, 60000);
            return () => clearInterval(timer);
        }, [endTime]);

        return <span>{timeLeft}</span>;
    };

    const userString = localStorage.getItem('user'); // 1. Lấy chuỗi thô

    // Chat widget state
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [chatSalonId, setChatSalonId] = useState(null);
    const currentUser = (() => {
        try {
            return JSON.parse(userString || 'null');
        } catch {
            return null;
        }
    })();

    const handleChatClick = () => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        setChatSalonId(null);
        setIsChatOpen(true);
    };

    // Listen for chat events from SalonCard
    useEffect(() => {
        const handleOpenChat = (event) => {
            const { salonId } = event.detail;
            setChatSalonId(salonId);
            setIsChatOpen(true);
        };

        window.addEventListener('openChatWithSalon', handleOpenChat);
        return () => {
            window.removeEventListener('openChatWithSalon', handleOpenChat);
        };
    }, []);

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
    const [flashSaleItems, setFlashSaleItems] = useState([]);
    const [loading, setLoading] = useState(true); // Mặc định là đang tải

    // 4. Hàm gọi API từ Backend
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salonsRes, flashsalesRes] = await Promise.all([
                    axios.get('http://localhost:5000/api/salons'),
                    axios.get('http://localhost:5000/api/flashsales/public/top').catch(() => ({ data: { data: [] } }))
                ]);
                setSalons(salonsRes.data);
                setFlashSaleItems(flashsalesRes.data?.data || []);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);


    return (
        <>
            {/* Header and home-container moved to MainLayout */}

            {/* --- PHẦN 2: BANNER (Tìm kiếm) --- */}
            <section className="hero-section">
                <div className="hero-content">
                    <h1>Discover Your Perfect<br /><span className="highlight">Beauty Experience</span></h1>
                    <p>Connect with top-rated salons, spas, and stylists in your area</p>

                    <form className="search-bar" onSubmit={handleSearch}>
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search for services, salons..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit">Search</button>
                    </form>

                    <div className="quick-tags">
                        <span className="tag" onClick={() => navigate('/search')}><FiMapPin /> Near Me</span>
                        <span className="tag" onClick={() => navigate('/coupons')}><HiTicket /> Coupons</span>
                        <span className="tag"><HiSparkles /> AI Reccommendations</span>
                    </div>
                </div>
            </section>



            {/* --- PHẦN 3: CATEGORY --- */}
            <section className="section-container">
                <div className="section-header">
                    <h2 className="section-title">Browse by Category</h2>
                </div>

                <div className="category-grid">
                    {categories.map((item) => (
                        <Link
                            key={item.id}
                            to={`/search?category=${item.name}`}
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

            {/* --- PHẦN FLASH SALE --- */}
            {flashSaleItems.length > 0 && (
                <section className="bg-gray">
                    <section className="section-container">
                        <div className="section-header">
                            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiTrendingUp color="#ef4444" />
                                Flash Sale
                            </h2>
                        </div>

                        <div className="flash-sale-grid">
                            {flashSaleItems.map((item) => (
                                <div key={item.id} className="flash-card" onClick={() => navigate(`/salon/${item.salon?._id}`)} style={{ cursor: 'pointer' }}>
                                    <div className="flash-card-header">
                                        <h3 className="flash-service-name">{item.service?.name}</h3>
                                        <div className="flash-timer">
                                            <FiClock size={14} />
                                            <CountdownTimer endTime={item.endTime} />
                                        </div>
                                    </div>

                                    <p className="flash-shop-name">{item.salon?.name}</p>

                                    <div className="flash-price-row">
                                        <span className="current-price">{item.discountedPrice?.toLocaleString('vi-VN')} VNĐ</span>
                                        <span className="old-price">{item.service?.price?.toLocaleString('vi-VN')} VNĐ</span>
                                        <span className="discount-tag">{item.percentOff}% OFF</span>
                                    </div>

                                    <button className="btn-book-now" onClick={(e) => { e.stopPropagation(); navigate(`/book-appointment?salonId=${item.salon?._id}&serviceId=${item.service?._id}`); }}>Book Now</button>
                                </div>
                            ))}
                        </div>
                    </section>
                </section>
            )}

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

            {/* Floating Message Button */}
            {currentUser && (
                <>
                    <button
                        className="chat-floating-btn"
                        onClick={handleChatClick}
                        title="Messages"
                    >
                        <MessageCircle size={24} />
                    </button>
                    {isChatOpen && (
                        <ChatWidget
                            userRole={currentUser.role}
                            salonId={chatSalonId}
                            onClose={() => {
                                setIsChatOpen(false);
                                setChatSalonId(null);
                            }}
                        />
                    )}
                </>
            )}

        </>
    );
};

export default HomePage;