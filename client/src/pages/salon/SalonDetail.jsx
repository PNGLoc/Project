import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../lib/axios";
import {
  Star,
  MapPin,
  Phone,
  Clock,
  Check,
  Share2,
  Heart,
  Tag,
  Gift,
  MessageCircle,
} from "lucide-react";
import couponApi from "../../features/coupon/api/couponApi";
import userCouponApi from "../../features/coupon/api/userCouponApi";
import ChatWidget from "../../components/chat/ChatWidget";
// tab UI implemented inline below (no external components needed)
import "../../assets/css/SalonDetail.css";

const SalonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salonData, setSalonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("services");
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponStatusFilter, setCouponStatusFilter] = useState("ALL");
  const [couponSortBy, setCouponSortBy] = useState("endDate");
  const [couponSortOrder, setCouponSortOrder] = useState("asc");
  const [collectedCouponIds, setCollectedCouponIds] = useState(new Set());
  const [collectingId, setCollectingId] = useState(null);
  const [couponToast, setCouponToast] = useState({ type: "", message: "" });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const isCustomer = currentUser?.role === "CUSTOMER";

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

  useEffect(() => {
    if (activeTab !== "coupons" || !id) return;
    const fetchSalonCoupons = async () => {
      try {
        setCouponsLoading(true);
        const params = {};
        if (couponStatusFilter !== "ALL") params.status = couponStatusFilter;
        params.sortBy = couponSortBy;
        params.sortOrder = couponSortOrder;
        const data = await couponApi.getSalonCoupons(id, params);
        setCoupons(data.coupons || []);
      } catch (err) {
        console.error("Lỗi tải coupons:", err);
        setCoupons([]);
      } finally {
        setCouponsLoading(false);
      }
    };
    fetchSalonCoupons();
  }, [id, activeTab, couponStatusFilter, couponSortBy, couponSortOrder]);

  useEffect(() => {
    if (activeTab !== "coupons" || !isCustomer) return;
    const fetchCollectedCoupons = async () => {
      try {
        const data = await userCouponApi.getMyCollectedCoupons();
        const items = data.items || [];
        const ids = new Set(items.map((i) => i.coupon?._id).filter(Boolean));
        setCollectedCouponIds(ids);
      } catch {
        setCollectedCouponIds(new Set());
      }
    };
    fetchCollectedCoupons();
  }, [activeTab, isCustomer]);

  const showCouponToast = (type, message) => {
    setCouponToast({ type, message });
    setTimeout(() => setCouponToast({ type: "", message: "" }), 3000);
  };

  const handleCollectCoupon = async (couponId) => {
    if (!isCustomer) {
      navigate("/login");
      return;
    }
    try {
      setCollectingId(couponId);
      await userCouponApi.collectCoupon(couponId);
      setCollectedCouponIds((prev) => new Set([...prev, couponId]));
      showCouponToast("success", "Đã lưu coupon vào tài khoản!");
    } catch (err) {
      showCouponToast("error", err.response?.data?.message || "Không thể lưu coupon");
    } finally {
      setCollectingId(null);
    }
  };

  const getCouponStatus = (coupon) => {
    if (!coupon.isActive) return { label: "Inactive", class: "coupon-status-inactive" };
    const now = new Date();
    const start = new Date(coupon.startDate);
    const end = new Date(coupon.endDate);
    if (now < start) return { label: "Upcoming", class: "coupon-status-upcoming" };
    if (now > end) return { label: "Expired", class: "coupon-status-expired" };
    if (coupon.usedCount >= coupon.usageLimit) return { label: "Used Up", class: "coupon-status-expired" };
    return { label: "Active", class: "coupon-status-active" };
  };

  const handleTabChange = (value) => {
    console.log("Tab changed to:", value); // Debug để kiểm tra tab có chuyển không
    setActiveTab(value);
  };

  const handleOpenReport = () => {
    if (!isCustomer) {
      navigate("/login");
      return;
    }
    setReportError("");
    setReportDescription("");
    setIsReportOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!reportDescription.trim()) {
      setReportError("Please describe the issue you encountered with this salon.");
      return;
    }
    try {
      setReportSubmitting(true);
      setReportError("");
      await axios.post("/api/reports/salon", {
        salonId: salon._id,
        description: reportDescription.trim(),
      });
      setIsReportOpen(false);
    } catch (err) {
      console.error("Submit report error:", err);
      setReportError(err.response?.data?.message || "Failed to submit report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
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
    navigate(`/book-appointment?salonId=${salon._id}`);
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
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
                <button onClick={handleBookAppointment} className="btn-book-appointment">
                  Book Appointment
                </button>
                {isCustomer && (
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="btn-chat-salon"
                    style={{
                      padding: '10px 20px',
                      background: 'white',
                      border: '1px solid #3b82f6',
                      color: '#3b82f6',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                      height: 'fit-content'
                    }}
                  >
                    <MessageCircle size={18} />
                    Chat with Salon
                  </button>
                )}
                {isCustomer && (
                  <button
                    onClick={handleOpenReport}
                    style={{
                      padding: "10px 20px",
                      background: "#fee2e2",
                      border: "1px solid #f97373",
                      color: "#b91c1c",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "600",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Report Salon
                  </button>
                )}
              </div>
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
          <button
            onClick={() => handleTabChange('coupons')}
            className={`salon-tab-btn${activeTab === 'coupons' ? ' active' : ''}`}
          >
            Coupons
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
                            navigate(`/book-appointment?salonId=${salon._id}&serviceId=${service._id}`)
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

          {activeTab === 'coupons' && (
            <>
              {couponToast.message && (
                <div className={`salon-coupon-toast ${couponToast.type}`}>
                  {couponToast.message}
                </div>
              )}
              <div className="salon-coupons-filters">
                <select
                  value={couponStatusFilter}
                  onChange={(e) => setCouponStatusFilter(e.target.value)}
                  className="salon-coupon-select"
                >
                  <option value="ALL">All status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="USED_UP">Used Up</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <select
                  value={`${couponSortBy}-${couponSortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setCouponSortBy(field);
                    setCouponSortOrder(order);
                  }}
                  className="salon-coupon-select"
                >
                  <option value="endDate-asc">Expiring Soon</option>
                  <option value="endDate-desc">Expiring Later</option>
                  <option value="discountValue-desc">Highest Discount</option>
                  <option value="discountValue-asc">Lowest Discount</option>
                  <option value="createdAt-desc">Newest First</option>
                </select>
              </div>
              {couponsLoading ? (
                <div className="text-center py-16 text-gray-500">Đang tải coupons...</div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  Chưa có coupon nào
                </div>
              ) : (
                <div className="salon-coupons-grid">
                  {coupons.map((coupon) => {
                    const status = getCouponStatus(coupon);
                    const discountText =
                      coupon.discountType === 'PERCENTAGE'
                        ? `${coupon.discountValue}%`
                        : `${coupon.discountValue?.toLocaleString('vi-VN')} VND`;
                    const isCollected = collectedCouponIds.has(coupon._id);
                    const canCollect = isCustomer && status.label === 'Active' && !isCollected;
                    return (
                      <div key={coupon._id} className="salon-coupon-card">
                        <div className="salon-coupon-header">
                          <span className="salon-coupon-code">
                            <Tag className="w-4 h-4" /> {coupon.code}
                          </span>
                          <span className={`salon-coupon-status ${status.class}`}>{status.label}</span>
                        </div>
                        <div className="salon-coupon-discount">{discountText} off</div>
                        {coupon.minPurchaseAmount > 0 && (
                          <div className="salon-coupon-min">
                            Min: {coupon.minPurchaseAmount.toLocaleString('vi-VN')} VND
                          </div>
                        )}
                        <div className="salon-coupon-validity">
                          Valid: {new Date(coupon.startDate).toLocaleDateString('vi-VN')} - {new Date(coupon.endDate).toLocaleDateString('vi-VN')}
                        </div>
                        {canCollect && (
                          <button
                            type="button"
                            className="salon-coupon-collect-btn"
                            onClick={() => handleCollectCoupon(coupon._id)}
                            disabled={collectingId === coupon._id}
                          >
                            <Gift className="w-4 h-4" />
                            {collectingId === coupon._id ? 'Đang lưu...' : 'Lưu coupon'}
                          </button>
                        )}
                        {isCollected && (
                          <span className="salon-coupon-collected-badge">
                            <Check className="w-4 h-4" /> Đã lưu
                          </span>
                        )}
                        {isCustomer && status.label !== 'Active' && !isCollected && (
                          <span className="salon-coupon-unavailable">Không thể lưu</span>
                        )}
                      </div>
                    );
                  })}
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

      {isChatOpen && isCustomer && (
        <ChatWidget
          userRole="CUSTOMER"
          salonId={salon._id}
          onClose={() => setIsChatOpen(false)}
        />
      )}

      {isReportOpen && isCustomer && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000
        }}>
          <div
            className="modal-content"
            style={{
              background: "white",
              borderRadius: 16,
              padding: 24,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 10px 25px rgba(15,23,42,0.18)"
            }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Report this salon
            </h3>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
              Please describe the problem in detail. Example: fake price, wrong description,
              staff attitude, scam behavior, etc.
            </p>

            {reportError && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 10
                }}
              >
                {reportError}
              </div>
            )}

            <textarea
              rows={5}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Describe the issue you had with this salon..."
              style={{
                width: "100%",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                padding: 10,
                fontSize: 14,
                resize: "vertical",
                marginBottom: 16
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 14
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={reportSubmitting}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#ef4444",
                  color: "white",
                  cursor: "pointer",
                  fontSize: 14,
                  opacity: reportSubmitting ? 0.7 : 1
                }}
              >
                {reportSubmitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonDetail;