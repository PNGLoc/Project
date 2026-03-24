import React, { useState, useEffect, useRef } from "react";
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
  Navigation,
  Edit2,
  Filter,
  ChevronDown,
} from "lucide-react";
import couponApi from "../../features/coupon/api/couponApi";
import userCouponApi from "../../features/coupon/api/userCouponApi";
import ChatWidget from "../../components/chat/ChatWidget";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
// tab UI implemented inline below (no external components needed)
import "../../assets/css/SalonDetail.css";

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SalonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salonData, setSalonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("services");
  const [flashsaleServices, setFlashsaleServices] = useState({});
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponTypeFilter, setCouponTypeFilter] = useState("");
  const [couponSortBy, setCouponSortBy] = useState("endDate");
  const [couponSortOrder, setCouponSortOrder] = useState("asc");
  const [collectedCouponIds, setCollectedCouponIds] = useState(new Set());
  const [collectingId, setCollectingId] = useState(null);
  const [couponToast, setCouponToast] = useState({ type: "", message: "" });
  const [showCouponFilterMenu, setShowCouponFilterMenu] = useState(false);
  const [showCouponSortMenu, setShowCouponSortMenu] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const couponFilterRef = useRef(null);
  const couponSortRef = useRef(null);

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const isCustomer = currentUser?.role === "CUSTOMER";

  useEffect(() => {
    const fetchSalonAndFlashsales = async () => {
      try {
        const [salonRes, flashsalesRes] = await Promise.all([
          axios.get(`/api/salons/${id}/details`),
          axios.get(`/api/flashsales/salon/${id}`).catch(() => ({ data: { data: [] } }))
        ]);

        if (salonRes.data.success) {
          setSalonData(salonRes.data.data);
        } else {
          setError(salonRes.data.message || "Failed to load salon information");
        }

        if (flashsalesRes.data?.success) {
          const fsMap = {};
          flashsalesRes.data.data.forEach(fs => {
            fs.services.forEach(serv => {
              const sid = serv.serviceId._id || serv.serviceId;
              const originalPrice = serv.serviceId.price || 0;
              let percentage = 0;
              let newPrice = originalPrice;
              if (serv.discountType === 'percentage') {
                percentage = serv.discountValue;
                newPrice = originalPrice - (originalPrice * percentage / 100);
              } else {
                percentage = (serv.discountValue / originalPrice) * 100;
                newPrice = originalPrice - serv.discountValue;
              }
              fsMap[sid] = { percentOff: Math.round(percentage), discountedPrice: newPrice };
            });
          });
          setFlashsaleServices(fsMap);
        }

      } catch (err) {
        console.error("Failed to fetch salon details:", err);
        setError("An error occurred while loading data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchSalonAndFlashsales();
  }, [id]);

  useEffect(() => {
    if (activeTab !== "coupons" || !id) return;
    const fetchSalonCoupons = async () => {
      try {
        setCouponsLoading(true);
        const params = {};
        if (couponTypeFilter) params.discountType = couponTypeFilter;
        params.sortBy = couponSortBy;
        params.sortOrder = couponSortOrder;
        const data = await couponApi.getSalonCoupons(id, params);
        setCoupons(data.coupons || []);
      } catch (err) {
        console.error("Failed to load coupons:", err);
        setCoupons([]);
      } finally {
        setCouponsLoading(false);
      }
    };
    fetchSalonCoupons();
  }, [id, activeTab, couponTypeFilter, couponSortBy, couponSortOrder]);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (couponFilterRef.current && !couponFilterRef.current.contains(event.target)) {
        setShowCouponFilterMenu(false);
      }
      if (couponSortRef.current && !couponSortRef.current.contains(event.target)) {
        setShowCouponSortMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      showCouponToast("success", "Coupon saved to your account!");
    } catch (err) {
      showCouponToast("error", err.response?.data?.message || "Unable to save coupon");
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

  const getCouponFilterLabel = () => {
    switch (couponTypeFilter) {
      case "PERCENTAGE":
        return "Percentage";
      case "FIXED_AMOUNT":
        return "Fixed Amount";
      default:
        return "All Types";
    }
  };

  const getCouponSortLabel = () => {
    const key = `${couponSortBy}-${couponSortOrder}`;
    switch (key) {
      case "endDate-asc":
        return "Expiring Soon";
      case "endDate-desc":
        return "Expiring Later";
      case "discountValue-desc":
        return "Highest Discount";
      case "discountValue-asc":
        return "Lowest Discount";
      case "createdAt-desc":
        return "Newest First";
      default:
        return "Sort By";
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d.toFixed(1);
  };

  useEffect(() => {
    if (activeTab === 'location' && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn("Geolocation error:", err)
      );
    }
  }, [activeTab]);

  useEffect(() => {
    if (userLocation && salonData?.salon?.location?.coordinates) {
      const [lng, lat] = salonData.salon.location.coordinates;
      const d = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
      setDistance(d);
    }
  }, [userLocation, salonData]);

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

  useEffect(() => {
    if (activeTab === 'reviews' && reviews.length === 0) {
      const fetchReviews = async () => {
        try {
          setReviewsLoading(true);
          const res = await axios.get(`/api/reviews/salon/${id}`);
          if (res.data.success) {
            setReviews(res.data.data);
          }
        } catch (err) {
          console.error("Failed to fetch reviews:", err);
        } finally {
          setReviewsLoading(false);
        }
      };
      fetchReviews();
    }
  }, [activeTab, id]);

  const handleOpenReview = (reviewToEdit = null) => {
    if (!isCustomer) {
      navigate("/login");
      return;
    }
    setReviewError("");
    setReviewImages([]);
    setIsReviewOpen(true);

    if (reviewToEdit && reviewToEdit._id) {
      setEditingReviewId(reviewToEdit._id);
      setReviewRating(reviewToEdit.rating);
      setReviewComment(reviewToEdit.comment || "");
    } else {
      setEditingReviewId(null);
      setReviewRating(5);
      setReviewComment("");
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files).slice(0, 5); // max 5
      setReviewImages(filesArray);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim() && reviewImages.length === 0) {
      setReviewError("Please provide a comment or upload at least one image.");
      return;
    }
    try {
      setReviewSubmitting(true);
      setReviewError("");

      const formData = new FormData();
      formData.append("rating", reviewRating);
      formData.append("comment", reviewComment.trim());
      reviewImages.forEach(file => {
        formData.append("images", file);
      });

      let res;
      if (editingReviewId) {
        res = await axios.put(`/api/reviews/${editingReviewId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (res.data.success) {
          setReviews(reviews.map(r => r._id === editingReviewId ? res.data.data : r));
          setIsReviewOpen(false);
          setSalonData(prev => ({
            ...prev,
            salon: {
              ...prev.salon,
              rating: prev.salon.reviews > 0 ? ((prev.salon.rating * prev.salon.reviews) - reviews.find(r => r._id === editingReviewId).rating + reviewRating) / prev.salon.reviews : reviewRating
            }
          }));
        }
      } else {
        formData.append("salonId", salon._id);
        res = await axios.post("/api/reviews", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });

        if (res.data.success) {
          setReviews([res.data.data, ...reviews]);
          setIsReviewOpen(false);
          setSalonData(prev => ({
            ...prev,
            salon: {
              ...prev.salon,
              rating: ((prev.salon.rating * prev.salon.reviews) + reviewRating) / (prev.salon.reviews + 1),
              reviews: prev.salon.reviews + 1
            }
          }));
        }
      }
    } catch (err) {
      console.error("Submit review error:", err);
      setReviewError(err.response?.data?.message || "Failed to submit review. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Loading salon details...
      </div>
    );
  }

  if (error || !salonData || !salonData.salon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-red-600">
        {error || "Salon not found or not approved yet"}
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
                <Star size={20} fill="#f59e0b" color="#f59e0b" style={{ marginRight: '4px' }} />
                <span className="salon-info-rating">{salon.rating ? salon.rating.toFixed(1) : "0"}</span>
                <span className="salon-info-reviews">({salon.reviews || 0} reviews)</span>
              </div>
              <div className="salon-info-contact-row">
                <MapPin className="icon-figma" />
                <span>{salon.address?.street}, {salon.address?.district}</span>
                <Phone className="icon-figma ml-4" />
                <span>{salon.phone}</span>

              </div>
            </div>
            <div className="salon-info-btn-col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch', width: '100%' }}>
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
          <button
            onClick={() => handleTabChange('location')}
            className={`salon-tab-btn${activeTab === 'location' ? ' active' : ''}`}
          >
            Location
          </button>
          <button
            onClick={() => handleTabChange('reviews')}
            className={`salon-tab-btn${activeTab === 'reviews' ? ' active' : ''}`}
          >
            Reviews
          </button>
        </div>

        <div className="mt-6">
          {activeTab === 'services' && (
            <>
              {services.length > 0 ? (
                <div className="salon-service-list">
                  {services.map((service) => {
                    const fs = flashsaleServices[service._id];
                    return (
                      <div key={service._id} className="salon-service-card">
                        <div className="salon-service-header">
                          <div className="salon-service-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                            {service.name}
                            {service.isPopular && (
                              <span className="salon-service-popular">Popular</span>
                            )}
                            {fs && (
                              <span style={{ padding: '2px 8px', background: '#fee2e2', color: '#ef4444', fontSize: '11px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                ⚡ {fs.percentOff}% OFF
                              </span>
                            )}
                          </div>
                          <span className="salon-service-price">
                            {fs ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{fs.discountedPrice.toLocaleString('vi-VN')} VNĐ</span>
                                <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '12px' }}>{service.price.toLocaleString('vi-VN')} VNĐ</span>
                              </div>
                            ) : (
                              `${service.price.toLocaleString('vi-VN')} VNĐ`
                            )}
                          </span>
                        </div>
                        <div className="salon-service-duration">{service.duration} min</div>
                        <div className="salon-service-book-row">
                          <button
                            className="salon-service-book-btn"
                            onClick={() =>
                              navigate(`/book-appointment?salonId=${salon._id}&serviceId=${service._id}`)
                            }
                          >
                            <span style={{ fontSize: '1.2em', marginRight: '6px' }}>&#10003;</span> Add to Booking
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="salon-empty-state text-center py-16 text-gray-500">
                  No services available yet.
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
                <div className="salon-coupons-filter-pill">
                  <div className="salon-filter-dropdown-container" ref={couponFilterRef}>
                    <button
                      type="button"
                      className="salon-filter-segment"
                      onClick={() => setShowCouponFilterMenu((prev) => !prev)}
                    >
                      <Filter className="salon-filter-icon" />
                      <span className="salon-filter-label">{getCouponFilterLabel()}</span>
                      <ChevronDown className="salon-filter-caret" />
                    </button>

                    {showCouponFilterMenu && (
                      <div className="salon-custom-filter-menu">
                        {[
                          { value: "", label: "All Types" },
                          { value: "PERCENTAGE", label: "Percentage" },
                          { value: "FIXED_AMOUNT", label: "Fixed Amount" },
                        ].map((item) => (
                          <div
                            key={item.value}
                            className={`salon-filter-menu-item ${couponTypeFilter === item.value ? "selected" : ""}`}
                            onClick={() => {
                              setCouponTypeFilter(item.value);
                              setShowCouponFilterMenu(false);
                            }}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="salon-filter-separator" />

                  <div className="salon-filter-dropdown-container" ref={couponSortRef}>
                    <button
                      type="button"
                      className="salon-filter-segment"
                      onClick={() => setShowCouponSortMenu((prev) => !prev)}
                    >
                      <Clock className="salon-filter-icon" />
                      <span className="salon-filter-label">{getCouponSortLabel()}</span>
                      <ChevronDown className="salon-filter-caret" />
                    </button>

                    {showCouponSortMenu && (
                      <div className="salon-custom-filter-menu">
                        {[
                          { value: "createdAt-desc", label: "Newest First" },
                          { value: "discountValue-desc", label: "Highest Discount" },
                          { value: "endDate-asc", label: "Expiring Soon" },
                        ].map((item) => (
                          <div
                            key={item.value}
                            className={`salon-filter-menu-item ${`${couponSortBy}-${couponSortOrder}` === item.value ? "selected" : ""}`}
                            onClick={() => {
                              const [field, order] = item.value.split("-");
                              setCouponSortBy(field);
                              setCouponSortOrder(order);
                              setShowCouponSortMenu(false);
                            }}
                          >
                            {item.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {couponsLoading ? (
                <div className="text-center py-16 text-gray-500">Loading coupons...</div>
              ) : coupons.length === 0 ? (
                <div className="salon-empty-state text-center py-16 text-gray-500">
                  No coupons available.
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
                            {collectingId === coupon._id ? 'Saving...' : 'Save Coupon'}
                          </button>
                        )}
                        {isCollected && (
                          <span className="salon-coupon-collected-badge">
                            <Check className="w-4 h-4" /> Saved
                          </span>
                        )}
                        {isCustomer && status.label !== 'Active' && !isCollected && (
                          <span className="salon-coupon-unavailable">Cannot save</span>
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
                <div className="salon-empty-state text-center py-16 text-gray-500">
                  No stylists added yet.
                </div>
              )}
            </>
          )}

          {activeTab === 'location' && (
            <div className="location-tab-content">
              <div className="map-card-container">
                {salon.location?.coordinates && (
                  <MapContainer
                    center={[salon.location.coordinates[1], salon.location.coordinates[0]]}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <Marker position={[salon.location.coordinates[1], salon.location.coordinates[0]]}>
                      <Popup>
                        <strong>{salon.name}</strong><br />
                        {salon.address?.street}, {salon.address?.district}
                      </Popup>
                    </Marker>
                  </MapContainer>
                )}
              </div>

              <div className="location-info-card">
                <h3 className="location-info-title">
                  <MapPin className="text-teal-600" /> Salon Location
                </h3>

                <div className="space-y-4">
                  <div className="location-detail-item">
                    <div className="location-icon-wrapper">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <div className="location-label">Address</div>
                      <div className="location-value">
                        {salon.address?.street}<br />
                        {salon.address?.district}, {salon.address?.city}
                      </div>
                    </div>
                  </div>

                  {distance && (
                    <div className="location-detail-item">
                      <div className="location-icon-wrapper" style={{ color: '#3b82f6' }}>
                        <Navigation size={20} />
                      </div>
                      <div>
                        <div className="location-label">Distance</div>
                        <div className="location-value">{distance} km from you</div>
                      </div>
                    </div>
                  )}

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${salon.location?.coordinates?.[1]},${salon.location?.coordinates?.[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-directions"
                  >
                    <Navigation size={20} /> Get Directions
                  </a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="reviews-tab-content" style={{ maxWidth: '1100px', margin: '2.5rem auto 0 auto', padding: '0 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 'bold' }}>Customer Reviews</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                    <Star size={18} fill="#f59e0b" color="#f59e0b" />
                    <span style={{ fontWeight: 'bold', fontSize: '18px' }}>{salon.rating?.toFixed(1) || 0}</span>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>({salon.reviews || 0})</span>
                  </div>
                </div>
                {isCustomer && (
                  <button onClick={handleOpenReview} style={{ padding: '8px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)', transition: 'all 0.2s' }}>
                    Write a Review
                  </button>
                )}
              </div>

              {reviewsLoading ? (
                <div className="text-center py-16 text-gray-500">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-16 text-gray-500" style={{ background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                  <Star size={48} color="#94a3b8" style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                  <p style={{ fontSize: '16px', color: '#64748b' }}>No reviews yet. Be the first to share your experience!</p>
                </div>
              ) : (
                <div className="reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {reviews.map(review => (
                    <div key={review._id} style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <img src={review.userId?.avatar ? `http://localhost:5000${review.userId.avatar}` : "https://randomuser.me/api/portraits/lego/1.jpg"} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{review.userId?.fullName || 'Anonymous'}</div>
                          <div style={{ color: '#64748b', fontSize: '12px' }}>{new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '2px', marginBottom: '8px' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} size={16} fill={star <= review.rating ? "#f59e0b" : "transparent"} color={star <= review.rating ? "#f59e0b" : "#cbd5e1"} />
                        ))}
                      </div>
                      <p style={{ fontSize: '14px', color: '#334155', marginBottom: '12px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{review.comment}</p>
                      {review.images && review.images.length > 0 && (
                        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                          {review.images.map((img, idx) => (
                            <img key={idx} src={`http://localhost:5000${img}`} alt="Review photo" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer' }} onClick={() => window.open(`http://localhost:5000${img}`, '_blank')} />
                          ))}
                        </div>
                      )}

                      {isCustomer && review.userId?._id === currentUser?._id && !review.isEdited && (
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleOpenReview(review)}
                            style={{
                              fontSize: '13px',
                              background: '#f8fafc',
                              border: '1px solid #3b82f6',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              color: '#3b82f6',
                              cursor: 'pointer',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(59, 130, 246, 0.1)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.color = 'white'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#3b82f6'; }}
                          >
                            <Edit2 size={14} /> Edit Review (1 left)
                          </button>
                        </div>
                      )}
                      {review.isEdited && (
                        <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', fontStyle: 'italic', textAlign: 'right' }}>(Edited)</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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

      {/* Review Modal */}
      {isReviewOpen && isCustomer && (
        <div className="modal-backdrop" style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
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
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: 24, fontWeight: 700 }}>{editingReviewId ? "Edit Review" : "Write a Review"}</h3>
              <button onClick={() => setIsReviewOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'center' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={40}
                  fill={star <= reviewRating ? "#f59e0b" : "transparent"}
                  color={star <= reviewRating ? "#f59e0b" : "#cbd5e1"}
                  style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => setReviewRating(star)}
                />
              ))}
            </div>

            {reviewError && (
              <div
                style={{
                  background: "#fee2e2",
                  color: "#b91c1c",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16
                }}
              >
                {reviewError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Share more about your experience</label>
              <textarea
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="What did you like or dislike? How was the service?"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  padding: 12,
                  fontSize: 15,
                  resize: "vertical",
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#334155' }}>Add photos (Optional, max 5)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              />
              {reviewImages.length > 0 && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>
                  {reviewImages.length} file(s) selected
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#475569'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewSubmitting}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: "#3b82f6",
                  color: "white",
                  cursor: reviewSubmitting ? "not-allowed" : "pointer",
                  fontSize: 15,
                  fontWeight: 'bold',
                  opacity: reviewSubmitting ? 0.7 : 1,
                  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                }}
              >
                {reviewSubmitting ? "Posting..." : (editingReviewId ? "Update Review" : "Post Review")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalonDetail;