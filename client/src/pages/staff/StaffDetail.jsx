import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../lib/axios";
import { ArrowLeft, MapPin, Phone } from "lucide-react";
import "../../assets/css/StaffDetail.css";

const BASE_URL = "http://localhost:5000";

const StaffDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`/api/staffs/profile/${id}`);
        if (res.data.success) {
          setStaffData(res.data.data);
        } else {
          setError(res.data.message || "Unable to load staff information");
        }
      } catch (err) {
        console.error("Error fetching staff details:", err);
        setError("An error occurred while loading data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [id]);

  const handleBookAtSalon = () => {
    if (staffData?.salonId?._id) {
      navigate(`/salon/${staffData.salonId._id}`);
    }
  };

  if (loading) {
    return (
      <div className="staff-detail-loading">
        Loading stylist information...
      </div>
    );
  }

  if (error || !staffData) {
    return (
      <div className="staff-detail-error">
        {error || "Stylist not found"}
      </div>
    );
  }

  const user = staffData.userId || {};
  const salon = staffData.salonId || {};
  const avatarSrc = user.avatar
    ? `${BASE_URL}${user.avatar}`
    : "https://randomuser.me/api/portraits/lego/1.jpg";
  const skills = (staffData.skills || []).filter((s) => s?.isActive !== false);
  const portfolio = staffData.portfolio || [];

  return (
    <div className="staff-detail-page">
      {/* Back button */}
      <div className="staff-detail-back">
        <button
          onClick={() => navigate(-1)}
          className="staff-detail-back-btn"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="staff-detail-hero">
        <div className="staff-detail-hero-content">
          <div className="staff-detail-avatar-wrapper">
            <img
              src={avatarSrc}
              alt={user.fullName}
              className="staff-detail-avatar"
            />
          </div>
          <div className="staff-detail-info">
            <h1 className="staff-detail-name">{user.fullName}</h1>
            <p className="staff-detail-role">Stylist</p>
            {user.bio && (
              <p className="staff-detail-bio">{user.bio}</p>
            )}
            <div className="staff-detail-actions">
              <button
                onClick={handleBookAtSalon}
                className="staff-detail-salon-btn"
              >
                View Salon
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="staff-detail-main max-w-4xl mx-auto px-4 py-12">
        {/* Skills Section - always show */}
        <section className="staff-detail-section">
          <h2 className="staff-detail-section-title">Skills & Expertise</h2>
          {skills.length > 0 ? (
            <div className="staff-detail-skills-grid">
              {skills.map((skill, idx) => (
                <div key={idx} className="staff-detail-skill-card">
                  <h4 className="staff-detail-skill-name">{skill.name}</h4>
                  {skill.description && (
                    <p className="staff-detail-skill-desc">{skill.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="staff-detail-empty">No skills listed.</p>
          )}
        </section>

        {/* Portfolio Section */}
        <section className="staff-detail-section">
          <h2 className="staff-detail-section-title">Portfolio</h2>
          {portfolio.length > 0 ? (
            <div className="staff-detail-portfolio-grid">
              {portfolio.map((post) =>
                (post.images || []).map((img, i) => (
                  <div key={`${post._id}-${i}`} className="staff-detail-portfolio-item">
                    <img
                      src={img.startsWith("/") ? `${BASE_URL}${img}` : img}
                      alt={`Portfolio ${i + 1}`}
                      className="staff-detail-portfolio-img"
                    />
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="staff-detail-empty">No portfolio images.</p>
          )}
        </section>

        {/* Salon info */}
        {salon.name && (
          <section className="staff-detail-section staff-detail-salon-section">
            <h2 className="staff-detail-section-title">Works at</h2>
            <div
              className="staff-detail-salon-card"
              onClick={handleBookAtSalon}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleBookAtSalon()}
            >
              {salon.images?.[0] && (
                <img
                  src={
                    salon.images[0].startsWith("/")
                      ? `${BASE_URL}${salon.images[0]}`
                      : salon.images[0]
                  }
                  alt={salon.name}
                  className="staff-detail-salon-thumb"
                />
              )}
              <div className="staff-detail-salon-info">
                <h3>{salon.name}</h3>
                {salon.address?.street && (
                  <p>
                    <MapPin className="w-4 h-4 inline" />
                    {salon.address.street}, {salon.address.district}
                  </p>
                )}
                {salon.phone && (
                  <p>
                    <Phone className="w-4 h-4 inline" />
                    {salon.phone}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default StaffDetail;
