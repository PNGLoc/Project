import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../lib/axios";
import {
  Star,
  MapPin,
  Phone,
  Clock,
  Wifi,
  Car,
  CreditCard,
  Check,
  Share2,
  Heart,
} from "lucide-react";
// tab UI implemented inline below (no external components needed)
import "../../assets/css/SalonDetail.css";

const SalonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salonData, setSalonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("services");

  useEffect(() => {
    const fetchSalon = async () => {
      try {
        const res = await axios.get(`/api/salons/${id}/details`);
        if (res.data.success) {
          setSalonData(res.data.data);
        } else {
          setError(res.data.message || "Không thể tải thông tin salon");
        }
      } catch (err) {
        console.error("Lỗi lấy chi tiết salon:", err);
        setError("Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };
    fetchSalon();
  }, [id]);

  const handleTabChange = (value) => {
    console.log("Tab changed to:", value); // Debug để kiểm tra tab có chuyển không
    setActiveTab(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Đang tải thông tin salon...
      </div>
    );
  }

  if (error || !salonData || !salonData.salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600">
        {error || "Không tìm thấy salon hoặc salon chưa được duyệt"}
      </div>
    );
  }

  const { salon, services = [], staffs = [] } = salonData;

 

  const handleBookAppointment = () => {
    navigate(`/booking?salonId=${salon._id}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <div className="salon-hero-container relative">
        <img
          src={salon.images?.[0] || "https://images.unsplash.com/photo-1511671782779-c97d3d27c1d4?w=1200"}
          className="salon-hero-img w-full h-full object-cover"
          alt="Salon cover"
        />
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute top-6 right-6 flex gap-3">
          <button className="p-2 bg-white/80 rounded-full hover:bg-white transition">
            <Share2 className="w-5 h-5 text-pink-500" />
          </button>
          <button className="p-2 bg-white/80 rounded-full hover:bg-white transition">
            <Heart className="w-5 h-5 text-pink-500" />
          </button>
        </div>
      </div>

      {/* CARD OVERLAY - Figma style */}
      <div className="max-w-6xl mx-auto px-4 -mt-32 relative z-10">
        <div className="salon-info-card-figma">
          <div className="salon-info-flex">
            <div className="salon-thumb-container">
              <img
                src={salon.images?.[0] || "https://images.unsplash.com/photo-1511671782779-c97d3d27c1d4?w=400"}
                className="salon-thumb-img"
                alt={salon.name}
              />
            </div>
            <div className="salon-info-main">
              <div className="salon-info-header-row">
                <h1 className="salon-info-title">{salon.name}</h1>
                {salon.isApproved && (
                  <span className="badge-verified-figma">
                    <Check className="w-3 h-3 stroke-[4px]" /> Verified
                  </span>
                )}
              </div>
              <div className="salon-info-desc">{salon.description || "Premium Hair Salon & Spa"}</div>
              <div className="salon-info-rating-row">
                <Star className="star-icon-figma" />
                <span className="salon-info-rating">{salon.rating?.toFixed(1) || "4.9"}</span>
                <span className="salon-info-reviews">({salon.reviews || 0} reviews)</span>
              </div>
              <div className="salon-info-contact-row">
                <MapPin className="icon-figma" />
                <span>{salon.address?.street}, {salon.address?.district}</span>
                <Phone className="icon-figma ml-4" />
                <span>{salon.phone}</span>
                <Clock className="icon-figma ml-4" />
       
              </div>
            </div>
            <div className="salon-info-btn-col">
              <button onClick={handleBookAppointment} className="btn-book-appointment">
                Book Appointment
              </button>
            </div>
          </div>
   
        </div>
      </div>

      {/* TABS - Figma style */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="salon-tabs-bar">
          <button
            onClick={() => handleTabChange('services')}
            className={`salon-tab-btn${activeTab === 'services' ? ' active' : ''}`}
          >
            Services
          </button>
          <button
            onClick={() => handleTabChange('stylists')}
            className={`salon-tab-btn${activeTab === 'stylists' ? ' active' : ''}`}
          >
            Stylists
          </button>
        </div>

        <div className="mt-6">
          {activeTab === 'services' && (
            <>
              {services.length > 0 ? (
                <div className="salon-service-list">
                  {services.map((service) => (
                    <div key={service._id} className="salon-service-card">
                      <div className="salon-service-header">
                        <div className="salon-service-title">
                          {service.name}
                          {service.isPopular && (
                            <span className="salon-service-popular">Popular</span>
                          )}
                        </div>
                        <span className="salon-service-price">${service.price}</span>
                      </div>
                      <div className="salon-service-duration">{service.duration} min</div>
                      <div className="salon-service-book-row">
                        <button
                          className="salon-service-book-btn"
                          onClick={() =>
                            navigate(`/booking?salonId=${salon._id}&serviceId=${service._id}`)
                          }
                        >
                          <span style={{fontSize:'1.2em',marginRight:'6px'}}>&#10003;</span> Add to Booking
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  Chưa có dịch vụ nào
                </div>
              )}
            </>
          )}

          {activeTab === 'stylists' && (
            <>
              {staffs.length > 0 ? (
                <div className="salon-stylists-grid">
                  {staffs.map((staff) => {
                    const user = staff.userId || {};
                    const avatarSrc = user.avatar
                      ? `http://localhost:5000${user.avatar}`
                      : "https://randomuser.me/api/portraits/lego/1.jpg";
                    return (
                      <div
                        key={staff._id}
                        className="salon-stylist-card salon-stylist-card-clickable"
                        onClick={() => navigate(`/staff/${staff._id}`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && navigate(`/staff/${staff._id}`)}
                      >
                        <div className="salon-stylist-avatar-wrapper">
                          <img
                            src={avatarSrc}
                            alt={user.fullName}
                            className="salon-stylist-avatar"
                          />
                        </div>

                        <div className="salon-stylist-body">
                          <h4 className="salon-stylist-name">
                            {user.fullName}
                          </h4>
                          <p className="salon-stylist-role">
                            {staff.role || "Stylist"}
                          </p>

                          {staff.specialties && staff.specialties.length > 0 && (
                            <div className="salon-stylist-tags">
                              {staff.specialties.map((spec) => (
                                <span key={spec} className="salon-stylist-tag">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="salon-stylist-availability">
                            {staff.isAvailable !== false ? "Available" : "Unavailable"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  Chưa có stylist nào được thêm.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalonDetail;