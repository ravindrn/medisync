import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import UserManagement from './UserManagement';
import DonationRequests from './DonationRequests';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalMedicines: 0,
        totalStockEntries: 0,
        totalUnits: 0,
        pendingNotifications: 0,
        adminUpdates: [],
        transferUpdates: []
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/stats');
            console.log('=== API RESPONSE ===');
            console.log('adminUpdates:', response.data.adminUpdates);
            console.log('transferUpdates:', response.data.transferUpdates);
            setStats(prev => ({
                ...prev,
                ...response.data
            }));
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const refreshDashboard = async () => {
        await fetchStats();
        toast.success('Dashboard refreshed!');
    };

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
        title: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        subtitle: {
            color: '#64748b',
            marginTop: '5px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
        },
        statCard: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
        },
        statValue: {
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#3b82f6',
            marginBottom: '10px'
        },
        statLabel: {
            color: '#64748b',
            fontSize: '14px'
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
            transition: 'all 0.3s'
        },
        activeTab: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        sectionTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #e5e7eb'
        },
        table: {
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            marginBottom: '30px'
        },
        th: {
            padding: '15px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb'
        },
        td: {
            padding: '15px',
            borderBottom: '1px solid #e5e7eb'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        refreshButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            marginTop: '10px'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading dashboard...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                    <div>
                        <h1 style={styles.title}>Admin Dashboard</h1>
                        <p style={styles.subtitle}>Welcome back, {user?.name}</p>
                    </div>
                    <button onClick={refreshDashboard} style={styles.refreshButton}>
                        🔄 Refresh Dashboard
                    </button>
                </div>
            </div>

            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalMedicines}</div>
                    <div style={styles.statLabel}>Total Medicines</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalStockEntries}</div>
                    <div style={styles.statLabel}>Stock Entries</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalUnits}</div>
                    <div style={styles.statLabel}>Total Units</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.pendingNotifications}</div>
                    <div style={styles.statLabel}>Pending Notifications</div>
                </div>
            </div>

            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'dashboard' ? styles.activeTab : {})
                    }}
                >
                    📊 Recent Updates
                </button>
                <button
                    onClick={() => setActiveTab('donations')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'donations' ? styles.activeTab : {})
                    }}
                >
                    🎁 Donation Requests
                </button>
                <button
                    onClick={() => setActiveTab('notifications')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'notifications' ? styles.activeTab : {})
                    }}
                >
                    🔔 Notification Requests
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'users' ? styles.activeTab : {})
                    }}
                >
                    👥 User Management
                </button>
            </div>

            {activeTab === 'donations' && <DonationRequests />}
            {activeTab === 'users' && <UserManagement />}

            {activeTab === 'dashboard' && (
                <div>
                    {/* Admin Stock Updates Section */}
                    <div>
                        <h3 style={styles.sectionTitle}>📦 Admin Stock Updates</h3>
                        {stats.adminUpdates && stats.adminUpdates.length > 0 ? (
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Medicine</th>
                                        <th style={styles.th}>Hospital</th>
                                        <th style={styles.th}>Change</th>
                                        <th style={styles.th}>Type</th>
                                        <th style={styles.th}>Updated By</th>
                                        <th style={styles.th}>Date</th>
                                    </tr>
                                    </thead>
                                <tbody>
                                    {stats.adminUpdates.map((update, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.td}>{update.medicineName} ({update.weight}{update.unit})</td>
                                            <td style={styles.td}>🏥 {update.hospitalName}</td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    color: update.changeAmount > 0 ? '#10b981' : '#ef4444',
                                                    fontWeight: '500'
                                                }}>
                                                    {update.changeAmount > 0 ? '+' : ''}{update.changeAmount} units
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    ...styles.badge,
                                                    backgroundColor: update.changeAmount > 0 ? '#d1fae5' : '#fee2e2',
                                                    color: update.changeAmount > 0 ? '#10b981' : '#dc2626'
                                                }}>
                                                    {update.changeAmount > 0 ? 'Stock Added' : 'Stock Removed'}
                                                </span>
                                            </td>
                                            <td style={styles.td}>{update.updatedBy?.name || 'System'}</td>
                                            <td style={styles.td}>{new Date(update.updatedAt).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px', marginBottom: '30px' }}>
                                No admin stock updates yet
                            </div>
                        )}
                    </div>

                    {/* Transfer Updates Section */}
                    <div>
                        <h3 style={styles.sectionTitle}>🔄 Hospital Transfer Updates</h3>
                        {stats.transferUpdates && stats.transferUpdates.length > 0 ? (
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Medicine</th>
                                        <th style={styles.th}>Sending Hospital</th>
                                        <th style={styles.th}>Receiving Hospital</th>
                                        <th style={styles.th}>Quantity</th>
                                        <th style={styles.th}>Transfer Direction</th>
                                        <th style={styles.th}>Status</th>
                                        <th style={styles.th}>Date</th>
                                    </tr>
                                    </thead>
                                <tbody>
                                    {stats.transferUpdates.map((transfer, idx) => {
                                        const sender = transfer.toHospital;
                                        const receiver = transfer.fromHospital;
                                        const quantity = transfer.quantity;
                                        
                                        return (
                                            <tr key={idx}>
                                                <td style={styles.td}>{transfer.medicineName} ({transfer.weight}{transfer.unit})</td>
                                                <td style={styles.td}>
                                                    <span style={{ 
                                                        backgroundColor: '#fee2e2', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        display: 'inline-block'
                                                    }}>
                                                        📤 {sender}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{ 
                                                        backgroundColor: '#d1fae5', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        display: 'inline-block'
                                                    }}>
                                                        📥 {receiver}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>
                                                        {quantity} units
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontSize: '12px', color: '#ef4444' }}>{sender}</span>
                                                        <span style={{ fontSize: '14px', color: '#3b82f6' }}>→</span>
                                                        <span style={{ fontSize: '12px', color: '#10b981' }}>{receiver}</span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        ...styles.badge,
                                                        backgroundColor: transfer.status === 'completed' ? '#d1fae5' : 
                                                                       transfer.status === 'approved' ? '#fef3c7' : 
                                                                       transfer.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                                                        color: transfer.status === 'completed' ? '#10b981' : 
                                                               transfer.status === 'approved' ? '#d97706' : 
                                                               transfer.status === 'rejected' ? '#dc2626' : '#6b7280'
                                                    }}>
                                                        {transfer.status === 'completed' ? '✓ Completed' : 
                                                         transfer.status === 'approved' ? '⏳ Approved' : 
                                                         transfer.status === 'rejected' ? '✗ Rejected' : 'Pending'}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    {new Date(transfer.createdAt || transfer.completedAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'white', borderRadius: '12px' }}>
                                No transfer updates yet
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'notifications' && <NotificationsList />}
        </div>
    );
};

const NotificationsList = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/admin/notifications');
            console.log('Notifications response:', response.data);
            setNotifications(response.data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
            const d = new Date(date);
            if (isNaN(d.getTime())) return 'Invalid Date';
            return d.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid Date';
        }
    };

    const styles = {
        container: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '800px'
        },
        th: {
            padding: '12px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #e5e7eb'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        outOfStockBadge: {
            backgroundColor: '#fee2e2',
            color: '#dc2626'
        },
        lowStockBadge: {
            backgroundColor: '#fef3c7',
            color: '#d97706'
        },
        shortageHighlight: {
            fontWeight: 'bold',
            color: '#dc2626'
        },
        refreshButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            marginBottom: '15px'
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '20px' }}>Loading notifications...</div>;

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0 }}>
                    Pending "Notify Me" Requests 
                    {notifications.length > 0 && (
                        <span style={{ fontSize: '14px', color: '#6b7280', marginLeft: '10px' }}>
                            ({notifications.length} requests)
                        </span>
                    )}
                </h3>
                <button onClick={fetchNotifications} style={styles.refreshButton}>
                    🔄 Refresh
                </button>
            </div>
            
            {notifications.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No pending notification requests
                </p>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>User</th>
                                <th style={styles.th}>Medicine</th>
                                <th style={styles.th}>Strength</th>
                                <th style={styles.th}>District</th>
                                <th style={styles.th}>Needed</th>
                                <th style={styles.th}>Available</th>
                                <th style={styles.th}>Shortage</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Requested Date</th>
                            </tr>
                            </thead>
                        <tbody>
                            {notifications.map((notif) => (
                                <tr key={notif._id}>
                                    <td style={styles.td}>
                                        <strong>{notif.user?.name || 'Unknown'}</strong>
                                        <br/>
                                        <small style={{ color: '#6b7280' }}>{notif.user?.email || 'No email'}</small>
                                    </td>
                                    <td style={styles.td}>
                                        <strong>{notif.medicineName}</strong>
                                    </td>
                                    <td style={styles.td}>
                                        {notif.weight}{notif.unit}
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{ 
                                            backgroundColor: '#e0f2fe', 
                                            padding: '4px 8px', 
                                            borderRadius: '12px',
                                            fontSize: '12px'
                                        }}>
                                            📍 {notif.district}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <strong>{notif.quantityNeeded}</strong> units
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{ 
                                            color: notif.currentStock === 0 ? '#dc2626' : '#10b981',
                                            fontWeight: '500'
                                        }}>
                                            {notif.currentStock} units
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={styles.shortageHighlight}>
                                            +{notif.shortage} units
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.badge,
                                            ...(notif.status === 'out_of_stock' ? styles.outOfStockBadge : styles.lowStockBadge)
                                        }}>
                                            {notif.status === 'out_of_stock' ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{ fontSize: '12px' }}>
                                            {formatDate(notif.requestedAt)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;