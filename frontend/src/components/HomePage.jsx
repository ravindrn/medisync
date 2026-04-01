import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import ExpandableMedicineCard from './Medicines/ExpandableMedicineCard';
import WatchlistTable from './Watchlist/WatchlistTable';
import AddToWatchlistModal from './Medicines/AddToWatchlistModal';
import DonorPrompt from './Donor/DonorPrompt';

const HomePage = () => {
    const { user } = useAuth();
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

    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px'
        },
        header: {
            textAlign: 'center',
            marginBottom: '30px',
            padding: '30px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        title: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '10px'
        },
        subtitle: {
            fontSize: '16px',
            color: '#64748b'
        },
        donorCallout: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '30px',
            color: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        donorContent: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '20px'
        },
        donorText: {
            flex: 1
        },
        donorIcon: {
            fontSize: '48px',
            marginBottom: '8px'
        },
        donorTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '4px'
        },
        donorDescription: {
            fontSize: '14px',
            opacity: 0.9
        },
        donorButton: {
            backgroundColor: 'white',
            color: '#667eea',
            border: 'none',
            padding: '12px 28px',
            borderRadius: '40px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        publicNotice: {
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            textAlign: 'center'
        },
        adminNotice: {
            backgroundColor: '#dbeafe',
            borderLeft: '4px solid #3b82f6',
            padding: '15px',
            marginBottom: '20px',
            borderRadius: '8px',
            textAlign: 'center'
        },
        districtInfoBanner: {
            backgroundColor: '#e0f2fe',
            padding: '12px',
            marginBottom: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #0284c7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        tabs: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        tab: {
            padding: '10px 20px',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.3s'
        },
        activeTab: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        searchArea: {
            border: '2px solid #e5e7eb',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: 'white'
        },
        tagsContainer: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '10px'
        },
        tag: {
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '5px 12px',
            borderRadius: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
        },
        removeTag: {
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
        },
        tagInput: {
            padding: '8px',
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: '200px',
            fontSize: '14px'
        },
        districtSelect: {
            width: '100%',
            padding: '12px',
            marginBottom: '15px',
            borderRadius: '8px',
            border: '2px solid #e5e7eb',
            fontSize: '16px',
            backgroundColor: 'white'
        },
        searchButton: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
        },
        searchButtonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        },
        resultsContainer: {
            marginTop: '20px'
        },
        loadingContainer: {
            textAlign: 'center',
            padding: '40px',
            fontSize: '18px',
            color: '#64748b',
            backgroundColor: 'white',
            borderRadius: '12px'
        },
        warningText: {
            color: '#f59e0b',
            fontSize: '12px',
            marginLeft: '10px'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={styles.title}>🏥 Medicine Stock Finder</h1>
                <p style={styles.subtitle}>
                    Search for medicines by name tags and find availability in your district
                </p>
            </div>

            {/* Donor Callout Section */}
            {!user && (
                <div style={styles.donorCallout}>
                    <div style={styles.donorContent}>
                        <div style={styles.donorText}>
                            <div style={styles.donorIcon}>🤝</div>
                            <div style={styles.donorTitle}>Join Our Donor Community!</div>
                            <div style={styles.donorDescription}>
                                Your unused medicines can save lives. Donate to hospitals in need and make a difference.
                            </div>
                        </div>
                        <button
                            onClick={() => setShowDonorPrompt(true)}
                            style={styles.donorButton}
                            onMouseEnter={(e) => {
                                e.target.style.transform = 'scale(1.05)';
                                e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.transform = 'scale(1)';
                                e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                        >
                            Become a Donor ❤️
                        </button>
                    </div>
                </div>
            )}

            {/* Donor Welcome Message */}
            {user && isDonor && (
                <div style={styles.donorCallout}>
                    <div style={styles.donorContent}>
                        <div style={styles.donorText}>
                            <div style={styles.donorIcon}>🎁</div>
                            <div style={styles.donorTitle}>Welcome back, Donor {user?.name}!</div>
                            <div style={styles.donorDescription}>
                                Thank you for your generosity! Your donations are making a difference.
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.href = '/donor'}
                            style={styles.donorButton}
                        >
                            Go to Donor Dashboard →
                        </button>
                    </div>
                </div>
            )}

            {!user && (
                <div style={styles.publicNotice}>
                    <p style={{ color: '#92400e', margin: 0 }}>
                        🔍 <strong>Public Search:</strong> You can search for medicines without logging in!
                        <br />
                        📝 <strong>Tip:</strong> Login to add medicines to your watchlist and track availability!
                    </p>
                </div>
            )}

            {user && isAdmin && (
                <div style={styles.adminNotice}>
                    <p style={{ color: '#1e40af', margin: 0 }}>
                        👑 <strong>Admin Mode:</strong> You are logged in as an administrator.
                        <br />
                        📦 Use the <strong>Admin Dashboard</strong> and <strong>Manage Medicines</strong> links above to manage the system.
                    </p>
                </div>
            )}

            {/* Only show tabs for non-admin users */}
            {user && !isAdmin && !isDonor && (
                <div style={styles.tabs}>
                    <button
                        onClick={() => setActiveTab('search')}
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'search' ? styles.activeTab : {})
                        }}
                    >
                        🔍 Search Medicines
                    </button>
                    <button
                        onClick={() => setActiveTab('watchlist')}
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'watchlist' ? styles.activeTab : {})
                        }}
                    >
                        📋 My Watchlist ({watchlist.length})
                    </button>
                </div>
            )}

            {/* Donor tabs - different view */}
            {user && isDonor && (
                <div style={styles.tabs}>
                    <button
                        onClick={() => setActiveTab('search')}
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'search' ? styles.activeTab : {})
                        }}
                    >
                        🔍 Search Medicines
                    </button>
                    <button
                        onClick={() => setActiveTab('donor')}
                        style={{
                            ...styles.tab,
                            ...(activeTab === 'donor' ? styles.activeTab : {})
                        }}
                    >
                        🎁 Donor Dashboard
                    </button>
                </div>
            )}

            {activeTab === 'search' && (
                <>
                    {/* District Info Banner for Search - Show for non-admin users only */}
                    {user && !isAdmin && selectedDistrict && (
                        <div style={styles.districtInfoBanner}>
                            <span style={{ color: '#0369a1' }}>
                                📍 Showing results for district: <strong>{selectedDistrict}</strong>
                            </span>
                            {user.district !== selectedDistrict && (
                                <span style={styles.warningText}>
                                    ⚠️ This is different from your registered district ({user.district})
                                </span>
                            )}
                        </div>
                    )}

                    <div style={styles.searchArea}>
                        <div style={styles.tagsContainer}>
                            {searchTags.map((tag, index) => (
                                <span key={index} style={styles.tag}>
                                    {tag}
                                    <button onClick={() => removeTag(tag)} style={styles.removeTag}>
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
                                style={styles.tagInput}
                            />
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            💡 Tip: Type first few letters of medicine name and press Enter to add search tags
                        </p>
                    </div>

                    <select
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        style={styles.districtSelect}
                    >
                        <option value="">Select District</option>
                        {districts.map(district => (
                            <option key={district} value={district}>{district}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleSearch}
                        disabled={searchTags.length === 0 || !selectedDistrict}
                        style={{
                            ...styles.searchButton,
                            ...(searchTags.length === 0 || !selectedDistrict ? styles.searchButtonDisabled : {})
                        }}
                    >
                        {loading ? 'Searching...' : 'Search Medicines'}
                    </button>

                    <div style={styles.resultsContainer}>
                        {loading ? (
                            <div style={styles.loadingContainer}>🔍 Searching for medicines...</div>
                        ) : medicines.length > 0 ? (
                            <>
                                <div style={{
                                    backgroundColor: '#f0fdf4',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    fontSize: '14px',
                                    color: '#166534',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '10px'
                                }}>
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
                                <div style={styles.loadingContainer}>
                                    😕 No medicines found matching "<strong>{searchTags.join(', ')}</strong>"
                                    <br />
                                    <span style={{ fontSize: '14px', marginTop: '10px', display: 'block', color: '#6b7280' }}>
                                        💡 Try using different tags or check the spelling
                                    </span>
                                </div>
                            )
                        )}
                    </div>
                </>
            )}

            {/* Watchlist - Only show for non-admin non-donor users */}
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
                        <div style={styles.loadingContainer}>
                            <span style={{ fontSize: '48px', display: 'block', marginBottom: '20px' }}>📭</span>
                            <p>Your watchlist is empty.</p>
                            <p style={{ fontSize: '14px', marginTop: '10px' }}>
                                Search for medicines and add them to track availability in your district:
                            </p>
                            <p style={{ 
                                fontSize: '16px', 
                                fontWeight: 'bold', 
                                color: '#3b82f6',
                                marginTop: '10px',
                                padding: '8px 16px',
                                backgroundColor: '#e0f2fe',
                                borderRadius: '8px',
                                display: 'inline-block'
                            }}>
                                📍 {user.district}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Donor Dashboard Redirect */}
            {user && isDonor && activeTab === 'donor' && (
                <div style={styles.loadingContainer}>
                    <p>Redirecting to Donor Dashboard...</p>
                    {window.location.href = '/donor'}
                </div>
            )}

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
                        window.location.href = '/donor';
                    }}
                />
            )}
        </div>
    );
};

export default HomePage;