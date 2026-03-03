import React, { useEffect, useState } from 'react';
import SalonCard from '../components/salon/SalonCard';
import '../assets/css/SearchPage.css';
import axios from 'axios';
import { FiSearch } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { Menu, X, Star } from 'lucide-react';

const PAGE_SIZE = 9;
const FILTER_DEFAULTS = {
    priceSort: null,
    rating: null,
    category: [],
};
const CATEGORIES = ['Hair', 'Nails', 'Spa', 'Massage', 'Facial', 'Makeup'];
const RATINGS = [
    { label: '4+ Stars', value: 4 },
    { label: '3+ Stars', value: 3 },
    { label: '2+ Stars', value: 2 },
    { label: '1+ Stars', value: 1 },
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
        const query = params.get('q') || '';

        setCategory(cat);
        setSearch(query);

        if (cat) setSearch(''); // Category search takes precedence and clears text search
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
        <div className="search-page-container">
            {/* Search area */}
            <div className="search-page-header">
                <div className="search-page-search-row">
                    <div className="search-page-search-bar">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder={category ? `Search in ${category}...` : "Search salons, services..."}
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCategory(''); setPage(1); }}
                        />
                    </div>
                    <button
                        className="search-page-filters-btn"
                        onClick={() => setShowFilters(true)}
                    >
                        <Menu size={18} /> Filters
                    </button>
                </div>
            </div>

            {/* Meta info */}
            <div className="search-page-meta">
                <span className="search-page-results"><b>{total}</b> results found</span>
                {category && (
                    <span className="search-page-category-badge">Category: <b>{category}</b></span>
                )}
            </div>

            {/* Salon grid */}
            {loading ? (
                <div className="search-page-loading">Loading amazing salons...</div>
            ) : (
                <div className="search-page-salon-grid">
                    {salons.map(salon => <SalonCard key={salon._id} data={salon} />)}
                </div>
            )}

            {/* Sidebar filters */}
            {showFilters && (
                <div className="search-page-overlay">
                    <div
                        className="search-page-overlay-backdrop"
                        onClick={() => setShowFilters(false)}
                    />
                    <div className="search-page-sidebar">
                        <div className="search-page-sidebar-header">
                            <h2 className="search-page-sidebar-title">Filters</h2>
                            <X size={24} className="search-page-sidebar-close" onClick={() => setShowFilters(false)} />
                        </div>
                        <p className="search-page-sidebar-desc">Refine your search results</p>

                        {/* Rating */}
                        <div className="search-page-filter-section">
                            <h4>Minimum Rating</h4>
                            {RATINGS.map(r => (
                                <label key={r.value} className="search-page-rating-option">
                                    <input
                                        type="checkbox"
                                        checked={filters.rating === r.value}
                                        onChange={() => handleFilterChange('rating', r.value)}
                                    />
                                    <div className="search-page-rating-content">
                                        <Star size={16} fill="#FFD700" color="#FFD700" />
                                        <span className="search-page-rating-label">{r.label}</span>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Category */}
                        <div className="search-page-filter-section">
                            <h4>Category</h4>
                            <div className="search-page-category-options">
                                {CATEGORIES.map(c => (
                                    <label key={c} className="search-page-category-option">
                                        <input
                                            type="checkbox"
                                            checked={filters.category.includes(c)}
                                            onChange={() => handleFilterChange('category', c)}
                                        />
                                        <span>{c}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="search-page-sidebar-actions">
                            <button
                                className="search-page-reset-btn"
                                onClick={() => setFilters(FILTER_DEFAULTS)}
                            >
                                Reset
                            </button>
                            <button
                                className="search-page-apply-btn"
                                onClick={() => setShowFilters(false)}
                            >
                                Show Results
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="search-page-pagination">
                    <button disabled={page === 1} onClick={() => setPage(page - 1)}>&lt;</button>
                    <div className="search-page-pagination-pages">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i + 1}
                                className={`search-page-pagination-page ${page === i + 1 ? 'active' : ''}`}
                                onClick={() => setPage(i + 1)}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                    <button disabled={page === totalPages} onClick={() => setPage(page + 1)}>&gt;</button>
                </div>
            )}
        </div>
    );
};

export default SearchPage;
