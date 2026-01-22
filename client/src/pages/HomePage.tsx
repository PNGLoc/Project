import { NavLink, Link } from 'react-router-dom';
import React from 'react';
import './HomePage.css';
import SalonCard from '../components/SalonCard';
import { Salon } from '../types'
import { FiSearch, FiScissors, FiClock, FiTrendingUp } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';
import { FaSpa, FaFire } from 'react-icons/fa';
import { GiFingernail, GiLipstick } from 'react-icons/gi';
import { TbMassage } from 'react-icons/tb';
import { MdFaceRetouchingNatural } from 'react-icons/md';
import { GoPerson } from "react-icons/go";
// import axiosClient from '../lib/axios';


const HomePage: React.FC = () => {



    // 1. Dữ liệu Categories 
    const categories = [
        { id: 1, name: 'Hair', icon: <FiScissors size={32} color="#f87171" /> },
        { id: 2, name: 'Nails', icon: <GiFingernail size={32} color="#fbbf24" /> },
        { id: 3, name: 'Spa', icon: <FaSpa size={32} color="#a78bfa" /> },
        { id: 4, name: 'Massage', icon: <TbMassage size={32} color="#fb923c" /> },
        { id: 5, name: 'Facial', icon: <MdFaceRetouchingNatural size={32} color="#f472b6" /> },
        { id: 6, name: 'Makeup', icon: <GiLipstick size={32} color="#e11d48" /> },
    ];

    // 2. Dữ liệu giả cho Danh sách Salon 
    const mockSalons: Salon[] = [
        { _id: '1', name: '30Shine Premium', address: 'Q. Ninh Kiều, Cần Thơ', rating: 4.9, images: ['https://images.unsplash.com/photo-1585747860715-2ba37e788b70'], isApproved: true },
        { _id: '2', name: 'Leekamy Beauty', address: 'Q. Cái Răng, Cần Thơ', rating: 4.7, images: ['https://images.unsplash.com/photo-1560066984-138dadb4c035'], isApproved: true },
        { _id: '3', name: 'Vintage Barber', address: 'Q. Bình Thủy, Cần Thơ', rating: 5.0, images: ['data:image/jpeg;base64,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'], isApproved: true },
        { _id: '4', name: 'Luxury Spa & Nails', address: 'Q. Ninh Kiều, Cần Thơ', rating: 4.8, images: ['https://images.unsplash.com/photo-1600948836101-f9ffda59d250'], isApproved: true },
    ];

    // const flashSaleItems = [
    //     {
    //         id: 1,
    //         service: 'Haircut & Styling',
    //         shop: 'Urban Cuts',
    //         timeLeft: '2h 34m',
    //         price: 35,
    //         originalPrice: 50,
    //         discount: '30% OFF'
    //     },
    //     {
    //         id: 2,
    //         service: 'Manicure + Pedicure',
    //         shop: 'Glamour Nails',
    //         timeLeft: '4h 12m',
    //         price: 40,
    //         originalPrice: 60,
    //         discount: '33% OFF'
    //     },
    //     {
    //         id: 3,
    //         service: 'Deep Tissue Massage',
    //         shop: 'Zen Spa',
    //         timeLeft: '1h 45m',
    //         price: 55,
    //         originalPrice: 80,
    //         discount: '31% OFF'
    //     }
    // ];

    return (
        <div className="home-container">
            {/* --- PHẦN 1: HEADER --- */}
            <header className="header">
                <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
                    <HiSparkles size={24} color="#0d9488" />
                    <span>SalonHub</span>
                </Link>

                <nav className="nav-links">
                    <NavLink to="/" className="active">Home</NavLink>
                    <NavLink to="/search">Search</NavLink>
                    <NavLink to="/lookbook">Lookbook</NavLink>
                    <NavLink to="/analysis">AI Analysis</NavLink>
                </nav>

                <div className="auth-actions">
                    <Link to="/sign-in" className="btn-text" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <GoPerson color='#666' /> Sign In
                    </Link>
                    <Link to="/sign-up" className="btn-primary" style={{ textDecoration: 'none' }}>
                        Sign Up
                    </Link>
                </div>
            </header>

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
                        <span><FaFire color='#ff952b' /> Trending:</span>
                        <span className="tag">Layered Haircut</span>
                        <span className="tag">Scalp Nourishing Wash</span>
                        <span className="tag">Nail Art</span>
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

            {/* --- PHẦN FLASH SALE --- */}
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

            {/* --- PHẦN 5: SALON  --- */}

            <div className="section-container">

                <div className="section-header">
                    <h2 className="section-title">Most Popular Salons</h2>
                    <a href="#" className="view-all">View All &rarr;</a>
                </div>

                <div className="salon-grid">
                    {mockSalons.map((salon) => (
                        <SalonCard key={salon._id} data={salon} />
                    ))}
                </div>

            </div>

        </div>
    );
};

export default HomePage;