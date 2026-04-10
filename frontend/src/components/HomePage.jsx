import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import ExpandableMedicineCard from './Medicines/ExpandableMedicineCard';
import WatchlistTable from './Watchlist/WatchlistTable';
import AddToWatchlistModal from './Medicines/AddToWatchlistModal';
import DonorPrompt from './Donor/DonorPrompt';
import '../styles/medisync.css';

const HomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [watchlist, setWatchlist] = useState([]);
    const [activeTab, setActiveTab] = useState('search');
    const [searchTags, setSearchTags] = useState([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [districts, setDistricts] = useState([]);
    const [inputTag, setInputTag] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [showDonorPrompt, setShowDonorPrompt] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isAdmin = user?.role === 'admin';
    const isDonor = user?.role === 'donor';

    useEffect(() => {
        fetchDistricts();
        if (user && !isAdmin) {
            fetchWatchlist();
            if (!selectedDistrict) {
                setSelectedDistrict(user.district);
            }
            const interval = setInterval(() => {
                if (activeTab === 'watchlist') {
                    fetchWatchlist();
                }
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [user, isAdmin, activeTab]);

    useEffect(() => {
        if (user && isDonor && activeTab === 'donor') {
            navigate('/donor');
        }
    }, [user, isDonor, activeTab, navigate]);

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            setDistricts(response.data);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
        }
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && inputTag.trim()) {
            e.preventDefault();
            if (!searchTags.includes(inputTag.trim().toLowerCase())) {
                setSearchTags([...searchTags, inputTag.trim().toLowerCase()]);
            }
            setInputTag('');
        }
    };

    const removeTag = (tagToRemove) => {
        setSearchTags(searchTags.filter(tag => tag !== tagToRemove));
    };

    const handleSearch = async () => {
        if (searchTags.length === 0) {
            toast.error('Please add at least one search tag');
            return;
        }
        
        if (!selectedDistrict) {
            toast.error('Please select a district');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/medicines/search', { 
                tags: searchTags, 
                district: selectedDistrict 
            });
            setMedicines(response.data);
            
            const totalMedicines = response.data.length;
            const medicinesWithStock = response.data.filter(m => m.hasStockInDistrict).length;
            const medicinesWithoutStock = totalMedicines - medicinesWithStock;
            
            if (totalMedicines === 0) {
                toast.error(`No medicines found matching "${searchTags.join(', ')}"`);
            } else {
                toast.success(
                    `Found ${totalMedicines} medicine(s) - ${medicinesWithStock} available, ${medicinesWithoutStock} currently out of stock`
                );
            }
        } catch (error) {
            toast.error('Failed to search medicines');
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWatchlist = async () => {
        try {
            const response = await api.get('/medicines/watchlist');
            setWatchlist(response.data);
        } catch (error) {
            console.error('Failed to fetch watchlist:', error);
        }
    };

    const refreshWatchlist = async () => {
        try {
            await fetchWatchlist();
            toast.success('Watchlist updated with latest stock information!');
        } catch (error) {
            console.error('Failed to refresh watchlist:', error);
            toast.error('Failed to refresh watchlist');
        }
    };

    const handleAddToWatchlist = async (medicineId, quantityNeeded) => {
        try {
            await api.post('/medicines/watchlist', { medicineId, quantityNeeded });
            toast.success(`Added ${selectedMedicine.medicineName} to watchlist!`);
            await fetchWatchlist();
            setShowModal(false);
            setSelectedMedicine(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add to watchlist');
        }
    };

    const handleOpenModal = (medicine) => {
        setSelectedMedicine(medicine);
        setShowModal(true);
    };

    const handleUpdateQuantity = async (itemId, quantityNeeded) => {
        try {
            await api.put(`/medicines/watchlist/${itemId}`, { quantityNeeded });
            toast.success('Quantity updated!');
            await fetchWatchlist();
        } catch (error) {
            toast.error('Failed to update quantity');
        }
    };

    const handleRemoveFromWatchlist = async (itemId) => {
        try {
            await api.delete(`/medicines/watchlist/${itemId}`);
            toast.success('Removed from watchlist');
            await fetchWatchlist();
        } catch (error) {
            toast.error('Failed to remove item');
        }
    };

    // Hero Section Component
    const HeroSection = () => (
        <div className="hero-section">
            <div className="hero-badge">
                <span className="hero-badge-icon">🏥</span>
                <span>MediSync Platform</span>
            </div>
            <h1 className="hero-title">
                Find Medicines
                <span className="hero-title-gradient"> Instantly</span>
            </h1>
            <p className="hero-subtitle">
                Connect with medicine stocks across Sri Lanka. Real-time availability, 
                smart search, and seamless coordination for healthcare providers.
            </p>
            {!user && (
                <div className="hero-buttons">
                    <button onClick={() => navigate('/login')} className="hero-btn-primary">
                        Get Started
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4.16666 10H15.8333M15.8333 10L10 4.16667M15.8333 10L10 15.8333" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    <button onClick={() => setShowDonorPrompt(true)} className="hero-btn-secondary">
                        Become a Donor
                        <span>❤️</span>
                    </button>
                </div>
            )}
        </div>
    );

    // Stats Section
    const StatsSection = () => (
        <div className="stats-grid">
            <div className="stat-card-modern">
                <div className="stat-icon-modern">💊</div>
                <div className="stat-content">
                    <h3>500+</h3>
                    <p>Medicines Available</p>
                </div>
            </div>
            <div className="stat-card-modern">
                <div className="stat-icon-modern">🏥</div>
                <div className="stat-content">
                    <h3>25+</h3>
                    <p>Partner Hospitals</p>
                </div>
            </div>
            <div className="stat-card-modern">
                <div className="stat-icon-modern">🤝</div>
                <div className="stat-content">
                    <h3>1000+</h3>
                    <p>Donations Processed</p>
                </div>
            </div>
            <div className="stat-card-modern">
                <div className="stat-icon-modern">📍</div>
                <div className="stat-content">
                    <h3>9</h3>
                    <p>Districts Covered</p>
                </div>
            </div>
        </div>
    );

    // Search Section
    const SearchSection = () => (
        <div className="search-section">
            <div className="search-header">
                <h2>Search Medicines</h2>
                <p>Find available medicines in your district</p>
            </div>

            <div className="search-tags-container">
                <div className="tags-input-wrapper">
                    <div className="tags-list">
                        {searchTags.map((tag, index) => (
                            <span key={index} className="tag-item">
                                {tag}
                                <button onClick={() => removeTag(tag)} className="tag-remove">×</button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={inputTag}
                            onChange={(e) => setInputTag(e.target.value)}
                            onKeyDown={handleAddTag}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder={searchTags.length === 0 ? "Type medicine name and press Enter..." : ""}
                            className="tags-input"
                        />
                    </div>
                    {isFocused && (
                        <div className="tags-suggestions">
                            <p>💡 Try: paracetamol, amoxicillin, vitamin, insulin</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="search-controls">
                <div className="district-selector">
                    <label>Select District</label>
                    <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="district-select"
                    >
                        <option value="">Choose your district</option>
                        {districts.map(district => (
                            <option key={district} value={district}>{district}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleSearch}
                    disabled={searchTags.length === 0 || !selectedDistrict}
                    className="search-button"
                >
                    {loading ? (
                        <span className="search-loading">
                            <span className="spinner-small"></span>
                            Searching...
                        </span>
                    ) : (
                        <span>
                            🔍 Search Medicines
                        </span>
                    )}
                </button>
            </div>
        </div>
    );

    // Results Section
    const ResultsSection = () => {
        if (loading) {
            return (
                <div className="results-loading">
                    <div className="loading-spinner"></div>
                    <p>Searching for medicines...</p>
                </div>
            );
        }

        if (medicines.length === 0 && searchTags.length > 0 && selectedDistrict) {
            return (
                <div className="results-empty">
                    <div className="empty-icon">🔍</div>
                    <h3>No medicines found</h3>
                    <p>We couldn't find any medicines matching "{searchTags.join(', ')}" in {selectedDistrict}</p>
                    <button onClick={() => {
                        setSearchTags([]);
                        setInputTag('');
                    }} className="empty-button">
                        Clear Search
                    </button>
                </div>
            );
        }

        if (medicines.length > 0) {
            const availableCount = medicines.filter(m => m.hasStockInDistrict).length;
            return (
                <div className="results-section">
                    <div className="results-header">
                        <div className="results-info">
                            <span className="results-badge">📊 Search Results</span>
                            <h3>Found {medicines.length} Medicines</h3>
                            <p>Matching "{searchTags.join(', ')}" in {selectedDistrict}</p>
                        </div>
                        <div className="results-stats">
                            <div className="stat-available">
                                <span className="stat-dot available"></span>
                                {availableCount} Available
                            </div>
                            <div className="stat-unavailable">
                                <span className="stat-dot unavailable"></span>
                                {medicines.length - availableCount} Out of Stock
                            </div>
                        </div>
                    </div>

                    <div className="medicines-grid">
                        {medicines.map((medicine) => (
                            <ExpandableMedicineCard
                                key={`${medicine._id}_${medicine.weight}_${medicine.unit}`}
                                medicine={medicine}
                                onAddToWatchlist={handleOpenModal}
                                user={user && !isAdmin && !isDonor ? user : null}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        return null;
    };

    // Watchlist Section
    const WatchlistSection = () => (
        <div className="watchlist-section">
            <div className="watchlist-header">
                <div>
                    <h2>Your Watchlist</h2>
                    <p>Track medicines you're interested in</p>
                </div>
                {watchlist.length > 0 && (
                    <button onClick={refreshWatchlist} className="refresh-button">
                        🔄 Refresh
                    </button>
                )}
            </div>

            {watchlist.length > 0 ? (
                <WatchlistTable
                    watchlist={watchlist}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveFromWatchlist}
                    userDistrict={user.district}
                    onRefresh={refreshWatchlist}
                />
            ) : (
                <div className="watchlist-empty">
                    <div className="empty-icon">📋</div>
                    <h3>Your watchlist is empty</h3>
                    <p>Search for medicines and add them to your watchlist to track availability</p>
                    <button onClick={() => setActiveTab('search')} className="empty-button">
                        Start Searching
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="modern-homepage">
            <HeroSection />
            
            <div className="main-container">
                {!user && <StatsSection />}
                
                {user && isAdmin && (
                    <div className="admin-notice">
                        <div className="notice-icon">👑</div>
                        <div className="notice-content">
                            <h4>Admin Mode Active</h4>
                            <p>You have full access to manage medicines and users</p>
                        </div>
                    </div>
                )}

                {user && isDonor && (
                    <div className="donor-welcome">
                        <div className="donor-welcome-icon">🎁</div>
                        <div className="donor-welcome-content">
                            <h3>Welcome back, {user.name}!</h3>
                            <p>Thank you for being a donor. Your contributions make a difference.</p>
                        </div>
                        <button onClick={() => navigate('/donor')} className="donor-action-btn">
                            Go to Dashboard →
                        </button>
                    </div>
                )}

                {user && !isAdmin && !isDonor && (
                    <div className="tabs-modern">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                        >
                            <span className="tab-icon">🔍</span>
                            Search Medicines
                        </button>
                        <button
                            onClick={() => setActiveTab('watchlist')}
                            className={`tab-btn ${activeTab === 'watchlist' ? 'active' : ''}`}
                        >
                            <span className="tab-icon">📋</span>
                            My Watchlist
                            {watchlist.length > 0 && <span className="tab-badge">{watchlist.length}</span>}
                        </button>
                    </div>
                )}

                {user && isDonor && (
                    <div className="tabs-modern">
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
                        >
                            <span className="tab-icon">🔍</span>
                            Search Medicines
                        </button>
                        <button
                            onClick={() => navigate('/donor')}
                            className="tab-btn"
                        >
                            <span className="tab-icon">🎁</span>
                            Donor Dashboard
                        </button>
                    </div>
                )}

                {activeTab === 'search' && (
                    <>
                        <SearchSection />
                        <ResultsSection />
                    </>
                )}

                {activeTab === 'watchlist' && user && !isAdmin && !isDonor && (
                    <WatchlistSection />
                )}
            </div>

            {showModal && selectedMedicine && !isAdmin && (
                <AddToWatchlistModal
                    isOpen={showModal}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedMedicine(null);
                    }}
                    medicine={selectedMedicine}
                    onConfirm={handleAddToWatchlist}
                    userDistrict={user?.district}
                />
            )}

            {showDonorPrompt && (
                <DonorPrompt
                    onClose={() => setShowDonorPrompt(false)}
                    onSuccess={() => {
                        setShowDonorPrompt(false);
                        navigate('/donor');
                    }}
                />
            )}
        </div>
    );
};

export default HomePage;
