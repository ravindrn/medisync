import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import DonationPledgeForm from './DonationPledgeForm';
import DonationHistory from './DonationHistory';

const DonorDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('shortages');
    const [shortages, setShortages] = useState([]);
    const [filteredShortages, setFilteredShortages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPledgeForm, setShowPledgeForm] = useState(false);
    const [selectedShortage, setSelectedShortage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [districts, setDistricts] = useState([]);
    const [stats, setStats] = useState({
        totalDonations: 0,
        totalItems: 0,
        livesImpacted: 0,
        pendingDonations: 0,
        completedDonations: 0
    });

    useEffect(() => {
        fetchDistricts();
        fetchShortages();
        fetchDonorStats();
    }, []);

    useEffect(() => {
        filterShortages();
    }, [searchTerm, selectedDistrict, shortages]);

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            if (response.data && Array.isArray(response.data)) {
                setDistricts(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch districts:', error);
            setDistricts([
                'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
                'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
                'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
                'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
                'Monaragala', 'Ratnapura', 'Kegalle'
            ]);
        }
    };

    const fetchShortages = async () => {
        setLoading(true);
        try {
            const response = await api.get('/donor/shortages');
            setShortages(response.data.shortages || []);
        } catch (error) {
            console.error('Failed to fetch shortages:', error);
            toast.error('Failed to load shortage data');
        } finally {
            setLoading(false);
        }
    };

    const fetchDonorStats = async () => {
        try {
            const historyRes = await api.get('/donor/history');
            const donations = historyRes.data;
            const totalDonations = donations.length;
            const totalItems = donations.reduce((sum, d) => sum + d.totalItems, 0);
            const pendingDonations = donations.filter(d => d.status === 'pending').length;
            const completedDonations = donations.filter(d => d.status === 'completed').length;
            
            setStats({
                totalDonations,
                totalItems,
                livesImpacted: totalItems * 10,
                pendingDonations,
                completedDonations
            });
        } catch (error) {
            console.error('Failed to fetch donor stats:', error);
        }
    };

    const filterShortages = () => {
        let filtered = [...shortages];
        
        // Filter by medicine name
        if (searchTerm.trim()) {
            filtered = filtered.filter(shortage =>
                shortage.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        
        // Filter by district
        if (selectedDistrict) {
            filtered = filtered.filter(shortage =>
                shortage.hospitals.some(h => h.district === selectedDistrict)
            );
        }
        
        setFilteredShortages(filtered);
    };

    const handleDonateNow = (shortage) => {
        setSelectedShortage(shortage);
        setShowPledgeForm(true);
    };

    const getUrgencyColor = (totalShortage) => {
        if (totalShortage < 50) return '#ef4444';
        if (totalShortage < 100) return '#f59e0b';
        return '#10b981';
    };

    const getUrgencyText = (totalShortage) => {
        if (totalShortage < 50) return 'Critical Need';
        if (totalShortage < 100) return 'Urgent Need';
        return 'Moderate Need';
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDistrict('');
    };

    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '24px',
            backgroundColor: '#f8fafc',
            minHeight: '100vh'
        },
        header: {
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
        },
        welcomeTitle: {
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '8px'
        },
        welcomeSubtitle: {
            fontSize: '14px',
            opacity: 0.9
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '32px'
        },
        statCard: {
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
        },
        statValue: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#10b981',
            marginBottom: '8px'
        },
        statLabel: {
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '4px'
        },
        statSub: {
            fontSize: '12px',
            color: '#94a3b8'
        },
        tabsContainer: {
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            backgroundColor: 'white',
            padding: '8px',
            borderRadius: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        tab: {
            flex: 1,
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        },
        activeTab: {
            backgroundColor: '#10b981',
            color: 'white'
        },
        filterSection: {
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        filterTitle: {
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        filterRow: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: '16px',
            alignItems: 'center'
        },
        searchInput: {
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s',
            width: '100%'
        },
        districtSelect: {
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
            outline: 'none'
        },
        clearButton: {
            padding: '12px 24px',
            backgroundColor: '#f1f5f9',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            color: '#475569',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
        },
        resultCount: {
            marginTop: '12px',
            fontSize: '13px',
            color: '#64748b'
        },
        shortageCard: {
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.3s',
            border: '1px solid #e2e8f0'
        },
        shortageHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px'
        },
        medicineInfo: {
            flex: 1
        },
        medicineName: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '4px'
        },
        medicineStrength: {
            fontSize: '14px',
            color: '#64748b'
        },
        urgencyBadge: {
            padding: '8px 16px',
            borderRadius: '30px',
            fontSize: '12px',
            fontWeight: '600',
            whiteSpace: 'nowrap'
        },
        shortageAmount: {
            backgroundColor: '#fef3c7',
            padding: '12px',
            borderRadius: '12px',
            marginBottom: '16px',
            textAlign: 'center'
        },
        shortageNumber: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#f59e0b'
        },
        hospitalsList: {
            marginTop: '16px',
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px'
        },
        hospitalItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            marginBottom: '8px'
        },
        hospitalName: {
            fontWeight: '500',
            color: '#1e293b'
        },
        hospitalDistrict: {
            fontSize: '12px',
            color: '#64748b',
            marginTop: '2px'
        },
        hospitalNeed: {
            fontWeight: 'bold',
            color: '#ef4444'
        },
        donateButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginTop: '16px',
            width: '100%'
        },
        quickDonateBtn: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            marginLeft: '12px',
            transition: 'all 0.2s'
        },
        emptyState: {
            textAlign: 'center',
            padding: '60px',
            backgroundColor: 'white',
            borderRadius: '16px',
            color: '#64748b'
        },
        loadingSpinner: {
            textAlign: 'center',
            padding: '60px',
            color: '#64748b'
        }
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingSpinner}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>❤️</div>
                    <p>Loading donation opportunities...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* Header Section */}
            <div style={styles.header}>
                <h1 style={styles.welcomeTitle}>Hello, {user?.name}! 👋</h1>
                <p style={styles.welcomeSubtitle}>
                    Thank you for being a part of our mission to make healthcare accessible to all.
                    Your generosity changes lives.
                </p>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalDonations}</div>
                    <div style={styles.statLabel}>Total Donations</div>
                    <div style={styles.statSub}>Made with ❤️</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalItems}</div>
                    <div style={styles.statLabel}>Items Donated</div>
                    <div style={styles.statSub}>Medicines contributed</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.livesImpacted}+</div>
                    <div style={styles.statLabel}>Lives Impacted</div>
                    <div style={styles.statSub}>Patients helped</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.pendingDonations}</div>
                    <div style={styles.statLabel}>Pending Donations</div>
                    <div style={styles.statSub}>Awaiting approval</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabsContainer}>
                <button
                    onClick={() => setActiveTab('shortages')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'shortages' ? styles.activeTab : {})
                    }}
                >
                    ⚠️ Urgent Needs
                </button>
                <button
                    onClick={() => setActiveTab('myDonations')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'myDonations' ? styles.activeTab : {})
                    }}
                >
                    📦 My Donations
                </button>
                <button
                    onClick={() => setActiveTab('impact')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'impact' ? styles.activeTab : {})
                    }}
                >
                    🌟 My Impact
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'shortages' && (
                    <>
                        {/* Filter Section */}
                        <div style={styles.filterSection}>
                            <div style={styles.filterTitle}>
                                🔍 Find Medicines to Donate
                            </div>
                            <div style={styles.filterRow}>
                                <input
                                    type="text"
                                    placeholder="Search by medicine name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={styles.searchInput}
                                />
                                <select
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    style={styles.districtSelect}
                                >
                                    <option value="">All Districts</option>
                                    {districts.map(district => (
                                        <option key={district} value={district}>{district}</option>
                                    ))}
                                </select>
                                <button onClick={clearFilters} style={styles.clearButton}>
                                    Clear Filters
                                </button>
                            </div>
                            <div style={styles.resultCount}>
                                Found {filteredShortages.length} medicine{filteredShortages.length !== 1 ? 's' : ''} in need
                            </div>
                        </div>

                        {filteredShortages.length === 0 ? (
                            <div style={styles.emptyState}>
                                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
                                <h3>No Medicines Found</h3>
                                <p>Try adjusting your search or district filter</p>
                                <button 
                                    onClick={clearFilters}
                                    style={{
                                        ...styles.clearButton,
                                        backgroundColor: '#10b981',
                                        color: 'white',
                                        marginTop: '16px'
                                    }}
                                >
                                    Show All Medicines
                                </button>
                            </div>
                        ) : (
                            <>
                                {filteredShortages.map((shortage, idx) => (
                                    <div key={idx} style={styles.shortageCard}>
                                        <div style={styles.shortageHeader}>
                                            <div style={styles.medicineInfo}>
                                                <div style={styles.medicineName}>
                                                    {shortage.medicineName}
                                                </div>
                                                <div style={styles.medicineStrength}>
                                                    {shortage.weight}{shortage.unit}
                                                </div>
                                            </div>
                                            <span style={{
                                                ...styles.urgencyBadge,
                                                backgroundColor: getUrgencyColor(shortage.totalShortage) + '20',
                                                color: getUrgencyColor(shortage.totalShortage)
                                            }}>
                                                {getUrgencyText(shortage.totalShortage)}
                                            </span>
                                        </div>

                                        <div style={styles.shortageAmount}>
                                            <span style={styles.shortageNumber}>{shortage.totalShortage} units</span>
                                            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                                                needed across {shortage.hospitals.length} hospitals
                                            </span>
                                        </div>

                                        <div style={styles.hospitalsList}>
                                            <strong style={{ fontSize: '13px', color: '#475569' }}>
                                                Hospitals in need:
                                            </strong>
                                            {shortage.hospitals
                                                .filter(h => !selectedDistrict || h.district === selectedDistrict)
                                                .slice(0, 3)
                                                .map((hospital, hidx) => (
                                                    <div key={hidx} style={styles.hospitalItem}>
                                                        <div>
                                                            <div style={styles.hospitalName}>
                                                                {hospital.hospitalName}
                                                            </div>
                                                            <div style={styles.hospitalDistrict}>
                                                                📍 {hospital.district}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <span style={styles.hospitalNeed}>
                                                                Needs {hospital.shortageAmount} units
                                                            </span>
                                                            <button
                                                                onClick={() => handleDonateNow(shortage)}
                                                                style={styles.quickDonateBtn}
                                                            >
                                                                Donate
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            {shortage.hospitals.filter(h => !selectedDistrict || h.district === selectedDistrict).length > 3 && (
                                                <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
                                                    + {shortage.hospitals.filter(h => !selectedDistrict || h.district === selectedDistrict).length - 3} more hospitals
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => handleDonateNow(shortage)}
                                            style={styles.donateButton}
                                        >
                                            🎁 Donate {shortage.medicineName}
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}

                {activeTab === 'myDonations' && (
                    <DonationHistory onUpdate={fetchDonorStats} />
                )}

                {activeTab === 'impact' && (
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌟</div>
                        <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#1e293b' }}>
                            Your Impact Matters!
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>
                            Every donation helps save lives. Thank you for being a part of our mission!
                        </p>
                        
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px',
                            marginTop: '32px'
                        }}>
                            <div style={{ backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#10b981' }}>
                                    {stats.totalItems}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Medicine items donated</div>
                            </div>
                            <div style={{ backgroundColor: '#eff6ff', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#3b82f6' }}>
                                    {stats.livesImpacted}+
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Patients helped</div>
                            </div>
                            <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>
                                    {stats.completedDonations}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>Completed donations</div>
                            </div>
                        </div>

                        <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#f8fafc', borderRadius: '12px' }}>
                            <p style={{ fontStyle: 'italic', color: '#475569' }}>
                                "The greatest gift is not being afraid to give." — Your generosity is changing lives, one medicine at a time.
                            </p>
                        </div>

                        <button
                            onClick={() => setActiveTab('shortages')}
                            style={{
                                ...styles.donateButton,
                                backgroundColor: '#10b981',
                                maxWidth: '300px',
                                margin: '32px auto 0'
                            }}
                        >
                            🎁 Make Another Donation
                        </button>
                    </div>
                )}
            </div>

            {/* Donation Pledge Form Modal */}
            {showPledgeForm && (
                <DonationPledgeForm
                    onClose={() => {
                        setShowPledgeForm(false);
                        setSelectedShortage(null);
                    }}
                    onSuccess={() => {
                        setShowPledgeForm(false);
                        setSelectedShortage(null);
                        fetchShortages();
                        fetchDonorStats();
                        toast.success('Thank you for your generosity! Your donation pledge has been submitted.');
                    }}
                    preselectedMedicine={selectedShortage}
                />
            )}
        </div>
    );
};

export default DonorDashboard;