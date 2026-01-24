// import { Link } from 'react-router-dom';
// import React, { useEffect, useState } from 'react';
// import '../../assets/css/HomePage.css';
// import SalonCard from '../components/salon/SalonCard';
// import HeaderHome from "../components/layout/HeaderHome";
// import axios from 'axios';
// import { HiSparkles } from 'react-icons/hi';

// const AllSalons = () => {

//     // 3. Khởi tạo state (Dùng JS thuần không cần khai báo kiểu dữ liệu)
//     const [salons, setSalons] = useState([]); // Mặc định là mảng rỗng
//     const [loading, setLoading] = useState(true); // Mặc định là đang tải

//     // 4. Hàm gọi API từ Backend
//     useEffect(() => {
//         const fetchSalons = async () => {
//             try {
//                 // Thay URL bằng endpoint API thật của bạn
//                 const response = await axios.get('http://localhost:5000/api/salons');
//                 setSalons(response.data);
//                 setLoading(false);
//             } catch (error) {
//                 console.error("Error fetching salons:", error);
//                 setLoading(false);
//             }
//         };

//         fetchSalons();
//     }, []);


//     return (
//         <div className="home-container">
//             {/* --- PHẦN 1: HEADER --- */}
//             <HeaderHome />

//             {/* --- PHẦN 2: BANNER (Tìm kiếm) --- */}
//             <section className="hero-section">
//                 <div className="search-bar">
//                     <FiSearch className="search-icon" />
//                     <input type="text" placeholder="Search for services, salons..." />
//                     <button>Search</button>
//                 </div>
//                 <div className="quick-tags">
//                     <span className="tag"><FiMapPin /> Near Me</span>
//                     <span className="tag"><HiSparkles /> AI Reccommendations</span>
//                 </div>
//             </section>

//             {/* --- PHẦN 5: SALON  --- */}

//             <div className="section-container">
//                 <div className="section-header">
//                     <h2 className="section-title">Top Rated Salon</h2>
//                     <Link to="/list" className="view-all">View All &rarr;</Link>
//                 </div>
//             </div>

//         </div>
//     );
// };

// export default AllSalons;

