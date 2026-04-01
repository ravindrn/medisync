import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import HospitalStockView from './HospitalStockView';
import TransferRequestModal from './TransferRequestModal';
import PendingRequestsList from './PendingRequestsList';
import TransferHistory from './TransferHistory';
import HospitalList from './HospitalList';
import PendingDeliveries from './PendingDeliveries';
import WardActivities from './WardActivities';
import WardStockSummary from './WardStockSummary';
import StockArrivalForm from './StockArrivalForm';

const ManagerDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('myStock');
    const [myHospital, setMyHospital] = useState(null);
    const [myStock, setMyStock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showStockArrivalModal, setShowStockArrivalModal] = useState(false);
    const [selectedHospital, setSelectedHospital] = useState(null);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchMyHospitalData();
    }, [refreshTrigger]);

    const fetchMyHospitalData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/medicines/my-hospital-stock');

            if (response.data && response.data.hospital) {
                setMyHospital(response.data.hospital);
                setMyStock(response.data.stock || []);
            } else {
                setError('No hospital data received');
            }
        } catch (error) {
            console.error('Failed to fetch hospital data:', error);
            setError(error.response?.data?.message || 'Failed to load hospital data');
            toast.error('Failed to load hospital data');
        } finally {
            setLoading(false);
        }
    };

    const refreshData = () => {
        setRefreshTrigger((prev) => prev + 1);
    };

    const handleRequestTransfer = (hospital, medicine) => {
        setSelectedHospital(hospital);
        setSelectedMedicine(medicine);
        setShowTransferModal(true);
    };

    const handleStockArrival = () => {
        setShowStockArrivalModal(true);
    };

    const tabs = [
        { id: 'myStock', label: 'My Hospital Stock', icon: '🏥' },
        { id: 'reportArrival', label: 'Report Stock Arrival', icon: '📦' },
        { id: 'wardSummary', label: 'Ward Summary', icon: '📊' },
        { id: 'wardActivities', label: 'Ward Activities', icon: '📋' },
        { id: 'pendingRequests', label: 'Pending Requests', icon: '⏳' },
        { id: 'pendingDeliveries', label: 'Pending Deliveries', icon: '📬' },
        { id: 'hospitals', label: 'Other Hospitals', icon: '🌍' },
        { id: 'history', label: 'Transfer History', icon: '📜' }
    ];

    const styles = {
        container: {
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '20px'
        },
        header: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        errorBox: {
            backgroundColor: '#fee2e2',
            borderLeft: '4px solid #dc2626',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#991b1b'
        },
        hospitalInfo: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginTop: '10px',
            padding: '15px',
            backgroundColor: '#f0f9ff',
            borderRadius: '8px'
        },
        hospitalName: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#0369a1'
        },
        hospitalDetail: {
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '4px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '15px'
        },
        statCard: {
            backgroundColor: '#f8fafc',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
        },
        statValue: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#3b82f6'
        },
        statLabel: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '5px'
        },
        tabs: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flexWrap: 'wrap'
        },
        tab: {
            padding: '10px 20px',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        activeTab: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        content: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minHeight: '500px'
        },
        refreshButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading dashboard...</div>;
    }

    if (error) {
        return (
            <div style={styles.container}>
                <div style={styles.header}>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Hospital Manager Dashboard</h1>
                    <p style={{ color: '#6b7280', marginTop: '5px' }}>Welcome back, {user?.name}</p>
                </div>
                <div style={styles.errorBox}>
                    <strong>Error:</strong> {error}
                    <button
                        onClick={refreshData}
                        style={{ marginLeft: '10px', padding: '4px 8px', cursor: 'pointer' }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const totalStock = myStock.reduce((sum, m) => sum + (m.availableQuantity || 0), 0);
    const lowStockCount = myStock.filter((m) => (m.availableQuantity || 0) < 50 && (m.availableQuantity || 0) > 0).length;
    const outOfStockCount = myStock.filter((m) => (m.availableQuantity || 0) === 0).length;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Hospital Manager Dashboard</h1>
                <p style={{ color: '#6b7280', marginTop: '5px' }}>Welcome back, {user?.name}</p>

                <div style={styles.hospitalInfo}>
                    <div>
                        <div style={styles.hospitalName}>🏥 {myHospital?.name || 'Unknown Hospital'}</div>
                        <div style={styles.hospitalDetail}>
                            📍 {myHospital?.district || 'Unknown'} | 📞 {myHospital?.phone || 'N/A'}
                        </div>
                    </div>
                    <button onClick={refreshData} style={styles.refreshButton}>
                        🔄 Refresh
                    </button>
                </div>

                <div style={styles.statsGrid}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{myStock.length}</div>
                        <div style={styles.statLabel}>Medicine Types</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{totalStock}</div>
                        <div style={styles.statLabel}>Total Units</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statValue, color: '#f59e0b' }}>{lowStockCount}</div>
                        <div style={styles.statLabel}>Low Stock Items</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statValue, color: '#ef4444' }}>{outOfStockCount}</div>
                        <div style={styles.statLabel}>Out of Stock</div>
                    </div>
                </div>
            </div>

            <div style={styles.tabs}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.id ? styles.activeTab : {})
                        }}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            <div style={styles.content}>
                {activeTab === 'myStock' && (
                    <HospitalStockView
                        stock={myStock}
                        hospital={myHospital}
                        onRequestTransfer={() => setActiveTab('hospitals')}
                        onNotifyStockArrival={handleStockArrival}
                    />
                )}

                {activeTab === 'reportArrival' && (
                    <StockArrivalForm
                        hospital={myHospital}
                        onSuccess={() => {
                            toast.success('Stock arrival notification sent to admin!');
                            refreshData();
                        }}
                    />
                )}

                {activeTab === 'wardSummary' && <WardStockSummary />}

                {activeTab === 'wardActivities' && <WardActivities />}

                {activeTab === 'pendingRequests' && myHospital && (
                    <PendingRequestsList
                        hospitalId={myHospital._id}
                        onRefresh={refreshData}
                    />
                )}

                {activeTab === 'pendingDeliveries' && myHospital && (
                    <PendingDeliveries />
                )}

                {activeTab === 'hospitals' && (
                    <HospitalList
                        onRequestTransfer={handleRequestTransfer}
                        currentHospitalId={myHospital?._id}
                    />
                )}

                {activeTab === 'history' && myHospital && (
                    <TransferHistory
                        hospitalId={myHospital._id}
                        onRefresh={refreshData}
                    />
                )}
            </div>

            {showTransferModal && (
                <TransferRequestModal
                    isOpen={showTransferModal}
                    onClose={() => {
                        setShowTransferModal(false);
                        setSelectedHospital(null);
                        setSelectedMedicine(null);
                    }}
                    fromHospital={myHospital}
                    toHospital={selectedHospital}
                    medicine={selectedMedicine}
                    onSuccess={refreshData}
                />
            )}

            {showStockArrivalModal && (
                <StockArrivalForm
                    isOpen={showStockArrivalModal}
                    onClose={() => {
                        setShowStockArrivalModal(false);
                    }}
                    hospital={myHospital}
                    onSuccess={() => {
                        setShowStockArrivalModal(false);
                        refreshData();
                        toast.success('Stock arrival reported! Admin will update inventory.');
                    }}
                />
            )}
        </div>
    );
};

export default ManagerDashboard;