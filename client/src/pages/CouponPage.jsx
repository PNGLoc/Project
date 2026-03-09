import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiFilter, FiCalendar, FiTag, FiClock, FiChevronDown } from 'react-icons/fi';
import { HiTicket } from 'react-icons/hi';
import { toast } from 'react-toastify';
import userCouponApi from '../features/coupon/api/userCouponApi';
import '../assets/css/SearchPage.css'; // Use SearchPage styles for consistency

const CouponPage = () => {
    const navigate = useNavigate();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [pagination, setPagination] = useState({ total: 0 });
    const [collectingId, setCollectingId] = useState(null);
    const [collectedCouponIds, setCollectedCouponIds] = useState(new Set());

    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    // Menu visibility state
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showSortMenu, setShowSortMenu] = useState(false);

    // Refs for clicking outside
    const filterRef = useRef(null);
    const sortRef = useRef(null);

    useEffect(() => {
        fetchCoupons();
    }, [filterType, sortBy, sortOrder]);

    useEffect(() => {
        if (currentUser?.role === 'CUSTOMER') {
            fetchCollectedCoupons();
        }
    }, [currentUser?.role]);

    const fetchCollectedCoupons = async () => {
        try {
            const data = await userCouponApi.getMyCollectedCoupons();
            const ids = new Set(data.items.map(item => item.coupon._id));
            setCollectedCouponIds(ids);
        } catch (error) {
            console.error('Error fetching collected coupons:', error);
        }
    };

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilterMenu(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSortMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchCoupons = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5000/api/coupons/public', {
                params: {
                    discountType: filterType,
                    sortBy,
                    sortOrder
                }
            });
            setCoupons(response.data.coupons || []);
            setPagination({ total: response.data.pagination?.total || 0 });
            setLoading(false);
        } catch (error) {
            console.error('Error fetching coupons:', error);
            setLoading(false);
        }
    };

    const handleCollect = async (couponId) => {
        if (!currentUser) {
            toast.info('Please login to collect coupons');
            navigate('/login', { state: { from: '/coupons' } });
            return;
        }

        if (currentUser.role !== 'CUSTOMER') {
            toast.warning('Only customers can collect coupons');
            return;
        }

        try {
            setCollectingId(couponId);
            await userCouponApi.collectCoupon(couponId);
            setCollectedCouponIds(prev => {
                const newSet = new Set(prev);
                newSet.add(couponId);
                return newSet;
            });
            toast.success('Coupon collected successfully! Check your profile.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to collect coupon');
        } finally {
            setCollectingId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('vi-VN');
    };

    const getFilterLabel = () => {
        switch (filterType) {
            case 'PERCENTAGE': return 'Percentage';
            case 'FIXED_AMOUNT': return 'Fixed Amount';
            default: return 'All Types';
        }
    };

    const getSortLabel = () => {
        const key = `${sortBy}-${sortOrder}`;
        switch (key) {
            case 'createdAt-desc': return 'Newest First';
            case 'discountValue-desc': return 'Highest Discount';
            case 'endDate-asc': return 'Ending Soon';
            default: return 'Sort By';
        }
    };

    return (
        <div className="search-page-container">
            {/* Filter Section - Centered and Premium Pill */}
            <div className="search-page-header" style={{ justifyContent: 'center', marginBottom: '40px' }}>
                <div style={{
                    display: 'flex',
                    background: '#fff',
                    borderRadius: '100px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1px solid #efefef',
                    alignItems: 'center',
                    padding: '6px'
                }}>
                    {/* Filter Type Segment */}
                    <div className="filter-dropdown-container" ref={filterRef}>
                        <div className="filter-segment"
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 20px',
                                borderRadius: '100px',
                                transition: 'background 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            <FiFilter style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }} />
                            <span style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                                {getFilterLabel()}
                            </span>
                            <FiChevronDown style={{ color: '#999', fontSize: '0.9rem' }} />
                        </div>

                        {showFilterMenu && (
                            <div className="custom-filter-menu">
                                <div className={`filter-menu-item ${filterType === '' ? 'selected' : ''}`}
                                    onClick={() => { setFilterType(''); setShowFilterMenu(false); }}>
                                    All Types
                                </div>
                                <div className={`filter-menu-item ${filterType === 'PERCENTAGE' ? 'selected' : ''}`}
                                    onClick={() => { setFilterType('PERCENTAGE'); setShowFilterMenu(false); }}>
                                    Percentage
                                </div>
                                <div className={`filter-menu-item ${filterType === 'FIXED_AMOUNT' ? 'selected' : ''}`}
                                    onClick={() => { setFilterType('FIXED_AMOUNT'); setShowFilterMenu(false); }}>
                                    Fixed Amount
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ width: '1px', background: '#eee', height: '24px' }}></div>

                    {/* Sort Order Segment */}
                    <div className="filter-dropdown-container" ref={sortRef}>
                        <div className="filter-segment"
                            onClick={() => setShowSortMenu(!showSortMenu)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 20px',
                                borderRadius: '100px',
                                transition: 'background 0.2s',
                                cursor: 'pointer'
                            }}
                        >
                            <FiClock style={{ color: 'var(--primary-color)', fontSize: '1.2rem' }} />
                            <span style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                                {getSortLabel()}
                            </span>
                            <FiChevronDown style={{ color: '#999', fontSize: '0.9rem' }} />
                        </div>

                        {showSortMenu && (
                            <div className="custom-filter-menu">
                                <div className={`filter-menu-item ${sortBy === 'createdAt' ? 'selected' : ''}`}
                                    onClick={() => { setSortBy('createdAt'); setSortOrder('desc'); setShowSortMenu(false); }}>
                                    Newest First
                                </div>
                                <div className={`filter-menu-item ${sortBy === 'discountValue' ? 'selected' : ''}`}
                                    onClick={() => { setSortBy('discountValue'); setSortOrder('desc'); setShowSortMenu(false); }}>
                                    Highest Discount
                                </div>
                                <div className={`filter-menu-item ${sortBy === 'endDate' ? 'selected' : ''}`}
                                    onClick={() => { setSortBy('endDate'); setSortOrder('asc'); setShowSortMenu(false); }}>
                                    Ending Soon
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    .filter-dropdown-container {
                        position: relative;
                    }
                    .filter-segment:hover {
                        background-color: #f8f8f8;
                    }
                    .custom-filter-menu {
                        position: absolute;
                        top: calc(100% + 12px);
                        left: 50%;
                        transform: translateX(-50%);
                        background: white;
                        border: 1px solid #e2e8f0;
                        border-radius: 16px;
                        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                        z-index: 1000;
                        min-width: 180px;
                        padding: 8px;
                        animation: menuFadeIn 0.2s ease-out;
                    }
                    @keyframes menuFadeIn {
                        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                        to { opacity: 1; transform: translateX(-50%) translateY(0); }
                    }
                    .filter-menu-item {
                        padding: 10px 16px;
                        border-radius: 10px;
                        font-size: 14px;
                        color: #475569;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .filter-menu-item:hover {
                        background: #f1f5f9;
                        color: #1e293b;
                    }
                    .filter-menu-item.selected {
                        background: #eff6ff;
                        color: var(--primary-color);
                        font-weight: 700;
                    }
                `}} />
            </div>

            {/* Meta Info */}
            <div className="search-page-meta">
                <span className="search-page-results"><b>{pagination.total}</b> coupons found</span>
            </div>

            {/* Coupon Grid */}
            {loading ? (
                <div className="search-page-loading">Loading coupons...</div>
            ) : (
                <div className="search-page-salon-grid">
                    {coupons.length > 0 ? (
                        coupons.map((coupon) => (
                            <div key={coupon._id} className="auth-card" style={{
                                textAlign: 'left',
                                padding: '1.5rem',
                                maxWidth: 'none',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.8rem',
                                border: '1px dashed var(--primary-color)',
                                background: '#fff',
                                borderRadius: '16px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1.4rem' }}>
                                        {coupon.code}
                                    </h3>
                                    <span className="discount-tag" style={{ background: '#fee2e2', color: '#ef4444', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                                        {coupon.discountType === 'PERCENTAGE'
                                            ? `${coupon.discountValue}% OFF`
                                            : `${coupon.discountValue.toLocaleString()}đ OFF`}
                                    </span>
                                </div>

                                <p style={{ margin: 0, fontWeight: '600', fontSize: '1.1rem' }}>
                                    {coupon.salonId?.name || 'Partner Salon'}
                                </p>

                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                                    {coupon.description || 'No description provided.'}
                                </p>

                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FiCalendar /> <span>Expires: {formatDate(coupon.endDate)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FiTag /> <span>Min spend: {coupon.minPurchaseAmount.toLocaleString()}đ</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FiClock /> <span>{coupon.usageLimit - coupon.usedCount} spots left</span>
                                    </div>
                                </div>

                                {(() => {
                                    const isCollected = collectedCouponIds.has(coupon._id);
                                    const isLoading = collectingId === coupon._id;
                                    return (
                                        <button
                                            className="btn"
                                            style={{
                                                marginTop: '0.5rem',
                                                background: isLoading || isCollected ? '#cbd5e1' : 'var(--primary-color)',
                                                color: '#fff',
                                                border: 'none',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                cursor: isLoading || isCollected ? 'not-allowed' : 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                            onClick={() => handleCollect(coupon._id)}
                                            disabled={isLoading || isCollected}
                                        >
                                            {isLoading ? 'Collecting...' : isCollected ? 'Collected' : 'Collect Coupon'}
                                        </button>
                                    );
                                })()}
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No coupons found matches your criteria.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CouponPage;
