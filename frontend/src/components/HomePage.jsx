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

    // Check if user is admin
    const isAdmin = user?.role === 'admin';
    const isDonor = user?.role === 'donor';

    useEffect(() => {
        fetchDistricts();
        if (user && !isAdmin) {
            fetchWatchlist();
            // Set default district to user's district when logged in
            if (!selectedDistrict) {
                setSelectedDistrict(user.district);
            }
            
            // Set up auto-refresh for watchlist every 30 seconds
            const interval = setInterval(() => {
                if (activeTab === 'watchlist') {
                    console.log('Auto-refreshing watchlist...');
                    fetchWatchlist();
                }
            }, 30000);
            
            return () => clearInterval(interval);
        }
    }, [user, isAdmin, activeTab]);

    // Redirect donor users to donor dashboard when they click the donor tab
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
            console.log('Manually refreshing watchlist...');
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

    return (
        <div className="container" style={{ padding: '20px' }}>
            {/* Header Section */}
            <div className="medisync-card" style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a2e', marginBottom: '10px' }}>
                    🏥 Medicine Stock Finder
                </h1>
                <p style={{ fontSize: '16px', color: '#666' }}>
                    Search for medicines by name tags and find availability in your district
                </p>
            </div>

            {/* Donor Callout Section */}
            {!user && (
                <div className="glass-effect" style={{ 
                    background: 'linear-gradient(135deg, #2A9CC1 0%, #47B2C2 100%)',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '30px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🤝</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>Join Our Donor Community!</div>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                Your unused medicines can save lives. Donate to hospitals in need and make a difference.
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDonorPrompt(true)}
                            className="btn-primary"
                            style={{ backgroundColor: 'white', color: '#2A9CC1', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                        >
                            Become a Donor ❤️
                        </button>
                    </div>
                </div>
            )}

            {/* Donor Welcome Message */}
            {user && isDonor && (
                <div className="glass-effect" style={{ 
                    background: 'linear-gradient(135deg, #2A9CC1 0%, #47B2C2 100%)',
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '30px',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎁</div>
                            <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '4px' }}>Welcome back, Donor {user?.name}!</div>
                            <div style={{ fontSize: '14px', opacity: 0.9 }}>
                                Thank you for your generosity! Your donations are making a difference.
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/donor')}
                            className="btn-primary"
                            style={{ backgroundColor: 'white', color: '#2A9CC1' }}
                        >
                            Go to Donor Dashboard →
                        </button>
                    </div>
                </div>
            )}

            {/* Public Notice */}
            {!user && (
                <div className="alert-info" style={{ marginBottom: '20px' }}>
                    🔍 <strong>Public Search:</strong> You can search for medicines without logging in!
                    <br />
                    📝 <strong>Tip:</strong> Login to add medicines to your watchlist and track availability!
                </div>
            )}

            {/* Admin Notice */}
            {user && isAdmin && (
                <div className="alert-info" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', borderLeftColor: '#3b82f6' }}>
                    👑 <strong>Admin Mode:</strong> You are logged in as an administrator.
                    <br />
                    📦 Use the <strong>Admin Dashboard</strong> and <strong>Manage Medicines</strong> links above to manage the system.
                </div>
            )}

            {/* Tabs for non-admin users */}
            {user && !isAdmin && !isDonor && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}
                    >
                        🔍 Search Medicines
                    </button>
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={activeTab === 'watchlist' ? 'btn-primary' : 'btn-secondary'}
                    >
                        📋 My Watchlist ({watchlist.length})
                    </button>
                </div>
            )}

            {/* Donor tabs */}
            {user && isDonor && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}
                    >
                        🔍 Search Medicines
                    </button>
                    <button
                        onClick={() => navigate('/donor')}
                        className={activeTab === 'donor' ? 'btn-primary' : 'btn-secondary'}
                    >
                        🎁 Donor Dashboard
                    </button>
                </div>
            )}

            {/* Search Tab Content */}
            {activeTab === 'search' && (
                <>
                    {/* District Info Banner */}
                    {user && !isAdmin && selectedDistrict && (
                        <div className="alert-info" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span>
                                📍 Showing results for district: <strong>{selectedDistrict}</strong>
                            </span>
                            {user.district !== selectedDistrict && (
                                <span style={{ color: '#f59e0b', fontSize: '12px' }}>
                                    ⚠️ This is different from your registered district ({user.district})
                                </span>
                            )}
                        </div>
                    )}

                    {/* Search Input Area */}
                    <div className="medisync-card" style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
                            {searchTags.map((tag, index) => (
                                <span key={index} className="badge badge-primary" style={{ padding: '5px 12px' }}>
                                    {tag}
                                    <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '8px', fontWeight: 'bold' }}>
                                        ×
                                    </button>
                                </span>
                            ))}
                            <input
                                type="text"
                                value={inputTag}
                                onChange={(e) => setInputTag(e.target.value)}
                                onKeyDown={handleAddTag}
                                placeholder="Type medicine name prefix and press Enter (e.g., 'amo', 'para')..."
                                className="modern-input"
                                style={{ flex: 1, minWidth: '200px' }}
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            💡 Tip: Type first few letters of medicine name and press Enter to add search tags
                        </p>
                    </div>

                    {/* District Select */}
                    <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        className="modern-select"
                        style={{ marginBottom: '20px' }}
                    >
                        <option value="">Select District</option>
                        {districts.map(district => (
                            <option key={district} value={district}>{district}</option>
                        ))}
                    </select>

                    {/* Search Button */}
                    <button
                        onClick={handleSearch}
                        disabled={searchTags.length === 0 || !selectedDistrict}
                        className="btn-primary"
                        style={{ width: '100%', marginBottom: '20px' }}
                    >
                        {loading ? 'Searching...' : 'Search Medicines'}
                    </button>

                    {/* Results Container */}
                    <div>
                        {loading ? (
                            <div className="medisync-card" style={{ textAlign: 'center', padding: '40px' }}>
                                <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                                <p>🔍 Searching for medicines...</p>
                            </div>
                        ) : medicines.length > 0 ? (
                            <>
                                <div className="alert-success" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <span>
                                        📊 Found <strong>{medicines.length}</strong> medicine(s) matching 
                                        "<strong>{searchTags.join(', ')}</strong>" in <strong>{selectedDistrict}</strong>
                                    </span>
                                    <span>
                                        ✅ {medicines.filter(m => m.hasStockInDistrict).length} available | 
                                        ⚠️ {medicines.filter(m => !m.hasStockInDistrict).length} out of stock
                                    </span>
                                </div>
                                
                                {medicines.map((medicine) => (
                                    <ExpandableMedicineCard
                                        key={`${medicine._id}_${medicine.weight}_${medicine.unit}`}
                                        medicine={medicine}
                                        onAddToWatchlist={handleOpenModal}
                                        user={user && !isAdmin && !isDonor ? user : null}
                                    />
                                ))}
                            </>
                        ) : (
                            searchTags.length > 0 && selectedDistrict && !loading && (
                                <div className="medisync-card" style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>😕</div>
                                    <p>No medicines found matching "<strong>{searchTags.join(', ')}</strong>"</p>
                                    <p style={{ fontSize: '14px', marginTop: '10px', color: '#666' }}>
                                        💡 Try using different tags or check the spelling
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                </>
            )}

            {/* Watchlist Tab */}
            {user && !isAdmin && !isDonor && activeTab === 'watchlist' && (
                <div>
                    {watchlist.length > 0 ? (
                        <WatchlistTable
                            watchlist={watchlist}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemove={handleRemoveFromWatchlist}
                            userDistrict={user.district}
                            onRefresh={refreshWatchlist}
                        />
                    ) : (
                        <div className="medisync-card" style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📭</div>
                            <p>Your watchlist is empty.</p>
                            <p style={{ fontSize: '14px', marginTop: '10px' }}>
                                Search for medicines and add them to track availability in your district:
                            </p>
                            <p className="badge badge-primary" style={{ marginTop: '10px', display: 'inline-block', padding: '8px 16px', fontSize: '16px' }}>
                                📍 {user.district}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
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
