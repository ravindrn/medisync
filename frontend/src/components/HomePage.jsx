import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';

import ExpandableMedicineCard from './Medicines/ExpandableMedicineCard';
import WatchlistTable from './Watchlist/WatchlistTable';
import AddToWatchlistModal from './Medicines/AddToWatchlistModal';
import DonorPrompt from './Donor/DonorPrompt';

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

    const isAdmin = user?.role === 'admin';
    const isDonor = user?.role === 'donor';

    /* ---------------- FETCH INITIAL DATA ---------------- */

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

    /* ---------------- DONOR REDIRECT FIX ---------------- */

    useEffect(() => {
        if (user && isDonor && activeTab === 'donor') {
            navigate('/donor');
        }
    }, [user, isDonor, activeTab, navigate]);

    /* ---------------- API CALLS ---------------- */

    const fetchDistricts = async () => {
        try {
            const res = await api.get('/medicines/districts');
            setDistricts(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchWatchlist = async () => {
        try {
            const res = await api.get('/medicines/watchlist');
            setWatchlist(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
        if (!searchTags.length) {
            toast.error('Please add at least one tag');
            return;
        }

        if (!selectedDistrict) {
            toast.error('Select a district');
            return;
        }

        setLoading(true);

        try {
            const res = await api.post('/medicines/search', {
                tags: searchTags,
                district: selectedDistrict
            });

            setMedicines(res.data);
            toast.success(`Found ${res.data.length} medicines`);
        } catch (err) {
            toast.error('Search failed');
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- TAG HANDLING ---------------- */

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && inputTag.trim()) {
            e.preventDefault();

            if (!searchTags.includes(inputTag.trim().toLowerCase())) {
                setSearchTags([...searchTags, inputTag.trim().toLowerCase()]);
            }
            setInputTag('');
        }
    };

    const removeTag = (tag) => {
        setSearchTags(searchTags.filter(t => t !== tag));
    };

    /* ---------------- WATCHLIST ---------------- */

    const handleOpenModal = (medicine) => {
        setSelectedMedicine(medicine);
        setShowModal(true);
    };

    const handleAddToWatchlist = async (medicineId, quantityNeeded) => {
        try {
            await api.post('/medicines/watchlist', { medicineId, quantityNeeded });
            toast.success('Added to watchlist');
            fetchWatchlist();
            setShowModal(false);
        } catch {
            toast.error('Failed to add');
        }
    };

    const handleRemoveFromWatchlist = async (id) => {
        await api.delete(`/medicines/watchlist/${id}`);
        fetchWatchlist();
    };

    const handleUpdateQuantity = async (id, quantityNeeded) => {
        await api.put(`/medicines/watchlist/${id}`, { quantityNeeded });
        fetchWatchlist();
    };

    /* ---------------- STYLES (SHORTENED) ---------------- */

    const styles = {
        container: { maxWidth: '1200px', margin: '0 auto', padding: 20 },
        header: { textAlign: 'center', marginBottom: 30 },
        title: { fontSize: 32, fontWeight: 'bold' },
        donorCallout: {
            background: 'linear-gradient(135deg,#667eea,#764ba2)',
            padding: 24,
            borderRadius: 16,
            color: 'white',
            marginBottom: 30
        },
        donorButton: {
            background: 'white',
            color: '#667eea',
            border: 'none',
            padding: '12px 28px',
            borderRadius: 40,
            cursor: 'pointer',
            fontWeight: 'bold'
        }
    };

    /* ---------------- UI ---------------- */

    return (
        <div style={styles.container}>

            <div style={styles.header}>
                <h1 style={styles.title}>🏥 Medicine Stock Finder</h1>
                <p>Search medicines by tags and district</p>
            </div>

            {/* DONOR CTA */}
            {!user && (
                <div style={styles.donorCallout}>
                    <h3>🤝 Join Our Donor Community</h3>
                    <button
                        style={styles.donorButton}
                        onClick={() => setShowDonorPrompt(true)}
                    >
                        Become a Donor ❤️
                    </button>
                </div>
            )}

            {/* DONOR WELCOME */}
            {user && isDonor && (
                <div style={styles.donorCallout}>
                    <h3>🎁 Welcome back, {user?.name}</h3>
                    <button
                        style={styles.donorButton}
                        onClick={() => navigate('/donor')}
                    >
                        Go to Donor Dashboard →
                    </button>
                </div>
            )}

            {/* SEARCH */}
            <div>
                {searchTags.map(tag => (
                    <span key={tag}>
                        {tag}
                        <button onClick={() => removeTag(tag)}>x</button>
                    </span>
                ))}

                <input
                    value={inputTag}
                    onChange={(e) => setInputTag(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Type medicine and press Enter"
                />

                <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                >
                    <option value="">Select District</option>
                    {districts.map(d => (
                        <option key={d}>{d}</option>
                    ))}
                </select>

                <button onClick={handleSearch}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </div>

            {/* RESULTS */}
            {medicines.map(med => (
                <ExpandableMedicineCard
                    key={med._id}
                    medicine={med}
                    onAddToWatchlist={handleOpenModal}
                    user={user && !isAdmin && !isDonor ? user : null}
                />
            ))}

            {/* WATCHLIST */}
            {user && !isAdmin && !isDonor && (
                <WatchlistTable
                    watchlist={watchlist}
                    onUpdateQuantity={handleUpdateQuantity}
                    onRemove={handleRemoveFromWatchlist}
                />
            )}

            {/* MODAL */}
            {showModal && selectedMedicine && (
                <AddToWatchlistModal
                    medicine={selectedMedicine}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleAddToWatchlist}
                />
            )}

            {/* DONOR PROMPT */}
            {showDonorPrompt && (
                <DonorPrompt onClose={() => setShowDonorPrompt(false)} />
            )}

        </div>
    );
};

export default HomePage;
