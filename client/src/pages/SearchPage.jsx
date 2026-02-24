import React, { useEffect, useState } from 'react';
import SalonCard from '../components/salon/SalonCard';
import '../assets/css/HomePage.css';
import axios from 'axios';
import { FiSearch } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { Menu, X, Star, ArrowUpNarrowWide, ArrowDownWideNarrow } from 'lucide-react';

const PAGE_SIZE = 9;
const FILTER_DEFAULTS = {
    priceSort: null,
    rating: null,
    category: [],
};
const CATEGORIES = ['Hair', 'Nails', 'Spa', 'Massage', 'Facial', 'Makeup'];
const RATINGS = [
    { label: '4.5+ Stars', value: 4.5 },
    { label: '4+ Stars', value: 4 },
    { label: '3.5+ Stars', value: 3.5 },
    { label: '3+ Stars', value: 3 },
];

const SearchPage = () => {
    const location = useLocation();
    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState(FILTER_DEFAULTS);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const cat = params.get('category') || '';
        setCategory(cat);
        if (cat) setSearch('');
        setPage(1);
    }, [location.search]);

    useEffect(() => {
        const fetchSalons = async () => {
            setLoading(true);
            try {
                const res = await axios.get('http://localhost:5000/api/salons');
                let filtered = res.data;
                
                if (category) {
                    filtered = filtered.filter(salon => {
                        const salonCategories = Array.isArray(salon.categories) && salon.categories.length
                            ? salon.categories : (salon.category ? [salon.category] : []);
                        return salonCategories.some(c => (c || '').toLowerCase() === category.toLowerCase());
                    });
                } else if (search.trim()) {
                    filtered = filtered.filter(salon =>
                        salon.name.toLowerCase().includes(search.toLowerCase()) ||
                        (salon.address?.street || '').toLowerCase().includes(search.toLowerCase())
                    );
                }

                if (filters.rating) {
                    filtered = filtered.filter(salon => typeof salon.rating === 'number' && salon.rating >= filters.rating);
                }

                if (filters.category.length) {
                    const selected = filters.category.map(c => c.toLowerCase());
                    filtered = filtered.filter(salon => {
                        const salonCategories = Array.isArray(salon.categories) && salon.categories.length
                            ? salon.categories : (salon.category ? [salon.category] : []);
                        return salonCategories.some(c => selected.includes((c || '').toLowerCase()));
                    });
                }

                if (filters.priceSort === 'lowToHigh') {
                    filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
                } else if (filters.priceSort === 'highToLow') {
                    filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
                }

                setTotal(filtered.length);
                setSalons(filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
            } catch (err) {
                setSalons([]);
            }
            setLoading(false);
        };
        fetchSalons();
    }, [page, search, category, filters]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    const handleFilterChange = (type, value) => {
        setFilters(prev => {
            if (type === 'priceSort') return { ...prev, priceSort: prev.priceSort === value ? null : value };
            if (type === 'rating') return { ...prev, rating: prev.rating === value ? null : value };
            if (type === 'category') {
                return {
                    ...prev,
                    category: prev.category.includes(value)
                        ? prev.category.filter(c => c !== value)
                        : [...prev.category, value],
                };
            }
            return prev;
        });
    };

    return (
        <div className="search-page-container" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            
            {/* SEARCH AREA: Nút Filters nằm sát cạnh thanh Search */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', width: '100%', maxWidth: '700px', gap: '10px' }}>
                    <div className="search-bar" style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '12px', 
                        padding: '10px 15px',
                        backgroundColor: '#fff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                        <FiSearch style={{ marginRight: '10px', color: '#94a3b8' }} />
                        <input
                            type="text"
                            placeholder={category ? `Search in ${category}...` : "Search salons, services..."}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCategory(''); setPage(1); }}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '16px' }}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(true)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            padding: '0 20px', 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            cursor: 'pointer', 
                            background: '#fff',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Menu size={18} /> Filters
                    </button>
                </div>
            </div>

            {/* Meta info */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b' }}><b>{total}</b> results found</span>
                {category && <span style={{ backgroundColor: '#f1f5f9', padding: '4px 12px', borderRadius: '20px', fontSize: '13px' }}>Category: <b>{category}</b></span>}
            </div>

            {/* Salon Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '100px 0', color: '#64748b' }}>Loading amazing salons...</div>
            ) : (
                <div className="salon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {salons.map(salon => <SalonCard key={salon._id} data={salon} />)}
                </div>
            )}

            {/* SIDEBAR FILTERS: Nằm sát bên phải */}
            {showFilters && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}>
                    <div 
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} 
                        onClick={() => setShowFilters(false)}
                    />
                    
                    <div style={{ 
                        position: 'relative', 
                        width: '380px', 
                        height: '100%', 
                        background: '#fff', 
                        boxShadow: '-10px 0 25px rgba(0,0,0,0.1)', 
                        padding: '40px 30px', 
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Filters</h2>
                            <X size={24} style={{ cursor: 'pointer' }} onClick={() => setShowFilters(false)} />
                        </div>
                        <p style={{ color: '#94a3b8', marginBottom: '32px' }}>Refine your search results</p>

                        {/* SORT BY PRICE: Thay thế Price Range
                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Sort by Price</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button 
                                    onClick={() => handleFilterChange('priceSort', 'lowToHigh')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', border: '1px solid',
                                        borderColor: filters.priceSort === 'lowToHigh' ? '#008080' : '#e2e8f0',
                                        background: filters.priceSort === 'lowToHigh' ? '#f0fdfa' : '#fff',
                                        cursor: 'pointer', transition: '0.2s', textAlign: 'left'
                                    }}
                                >
                                    <ArrowUpNarrowWide size={18} color={filters.priceSort === 'lowToHigh' ? '#008080' : '#64748b'} />
                                    <span style={{ color: filters.priceSort === 'lowToHigh' ? '#008080' : '#475569', fontWeight: filters.priceSort === 'lowToHigh' ? '600' : '400' }}>Price: Low to High</span>
                                </button>
                                <button 
                                    onClick={() => handleFilterChange('priceSort', 'highToLow')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderRadius: '10px', border: '1px solid',
                                        borderColor: filters.priceSort === 'highToLow' ? '#008080' : '#e2e8f0',
                                        background: filters.priceSort === 'highToLow' ? '#f0fdfa' : '#fff',
                                        cursor: 'pointer', transition: '0.2s', textAlign: 'left'
                                    }}
                                >
                                    <ArrowDownWideNarrow size={18} color={filters.priceSort === 'highToLow' ? '#008080' : '#64748b'} />
                                    <span style={{ color: filters.priceSort === 'highToLow' ? '#008080' : '#475569', fontWeight: filters.priceSort === 'highToLow' ? '600' : '400' }}>Price: High to Low</span>
                                </button>
                            </div>
                        </div> */}

                        {/* RATING */}
                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Minimum Rating</h4>
                            {RATINGS.map(r => (
                                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filters.rating === r.value}
                                        onChange={() => handleFilterChange('rating', r.value)}
                                        style={{ width: '18px', height: '18px', accentColor: '#008080' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Star size={16} fill="#FFD700" color="#FFD700" />
                                        <span style={{ fontSize: '15px', color: '#475569' }}>{r.label}</span>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* CATEGORY */}
                        <div style={{ marginBottom: '32px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Category</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                                {CATEGORIES.map(c => (
                                    <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={filters.category.includes(c)}
                                            onChange={() => handleFilterChange('category', c)}
                                            style={{ width: '18px', height: '18px', accentColor: '#008080' }}
                                        />
                                        <span style={{ fontSize: '15px', color: '#475569' }}>{c}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setFilters(FILTER_DEFAULTS)}
                                style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Reset
                            </button>
                            <button 
                                onClick={() => setShowFilters(false)}
                                style={{ flex: 2, padding: '12px', borderRadius: '10px', border: 'none', background: '#008080', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
                            >
                                Show Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAGINATION: Tập trung vào giữa */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '60px', paddingBottom: '40px' }}>
                    <button 
                        disabled={page === 1} 
                        onClick={() => setPage(page - 1)}
                        style={{ width: '40px', height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        &lt;
                    </button>
                    
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                onClick={() => setPage(i + 1)}
                                style={{
                                    width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid',
                                    borderColor: page === i + 1 ? '#008080' : '#e2e8f0',
                                    borderRadius: '8px', cursor: 'pointer',
                                    background: page === i + 1 ? '#008080' : '#fff',
                                    color: page === i + 1 ? '#fff' : '#475569',
                                    fontWeight: '600'
                                }}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>

                    <button 
                        disabled={page === totalPages} 
                        onClick={() => setPage(page + 1)}
                        style={{ width: '40px', height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        &gt;
                    </button>
                </div>
            )}
        </div>
    );
};

export default SearchPage;