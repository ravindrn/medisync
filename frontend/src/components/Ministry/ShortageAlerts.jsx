import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ShortageAlerts = ({ onRefresh }) => {
    const [shortages, setShortages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchShortages();
    }, []);

    const fetchShortages = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ministry/shortages');
            setShortages(response.data.shortages);
            console.log('Shortages:', response.data);
        } catch (error) {
            console.error('Failed to fetch shortages:', error);
            toast.error('Failed to load shortage data');
        } finally {
            setLoading(false);
        }
    };

    const filteredShortages = shortages.filter(shortage => {
        if (filter === 'critical') return shortage.status === 'Critical';
        if (filter === 'low') return shortage.status === 'Low Stock';
        return true;
    });

    const getSeverityColor = (severity) => {
        if (severity === 'High') return '#dc2626';
        if (severity === 'Medium') return '#f59e0b';
        return '#10b981';
    };

    const styles = {
        container: { padding: '10px' },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        filterButtons: {
            display: 'flex',
            gap: '10px'
        },
        filterButton: {
            padding: '6px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '13px'
        },
        activeFilter: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderColor: '#3b82f6'
        },
        statsCards: {
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        statCard: {
            backgroundColor: '#f8fafc',
            padding: '15px',
            borderRadius: '8px',
            flex: 1,
            textAlign: 'center'
        },
        statValue: {
            fontSize: '28px',
            fontWeight: 'bold'
        },
        alertCard: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s'
        },
        alertHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px'
        },
        medicineName: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1f2937'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        detailsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '12px'
        },
        detailItem: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb'
        },
        detailLabel: {
            fontSize: '13px',
            color: '#6b7280'
        },
        detailValue: {
            fontWeight: '500',
            color: '#1f2937'
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
        },
        refreshButton: {
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        }
    };

    const criticalCount = shortages.filter(s => s.status === 'Critical').length;
    const lowStockCount = shortages.filter(s => s.status === 'Low Stock').length;

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading shortage alerts...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>⚠️ Shortage Alerts</h2>
                <button onClick={fetchShortages} style={styles.refreshButton}>
                    🔄 Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsCards}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#ef4444' }}>{shortages.length}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Shortages</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#dc2626' }}>{criticalCount}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Critical ({"<"}10 units)</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#f59e0b' }}>{lowStockCount}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Low Stock ({"<"}50 units)</div>
                </div>
            </div>

            {/* Filters */}
            <div style={styles.filterButtons}>
                <button
                    onClick={() => setFilter('all')}
                    style={{ ...styles.filterButton, ...(filter === 'all' ? styles.activeFilter : {}) }}
                >
                    All ({shortages.length})
                </button>
                <button
                    onClick={() => setFilter('critical')}
                    style={{ ...styles.filterButton, ...(filter === 'critical' ? styles.activeFilter : {}) }}
                >
                    Critical ({criticalCount})
                </button>
                <button
                    onClick={() => setFilter('low')}
                    style={{ ...styles.filterButton, ...(filter === 'low' ? styles.activeFilter : {}) }}
                >
                    Low Stock ({lowStockCount})
                </button>
            </div>

            {/* Alerts List */}
            {filteredShortages.length === 0 ? (
                <div style={styles.emptyState}>No shortage alerts found</div>
            ) : (
                filteredShortages.map((alert, idx) => (
                    <div key={idx} style={styles.alertCard}>
                        <div style={styles.alertHeader}>
                            <div style={styles.medicineName}>
                                {alert.medicineName} ({alert.weight}{alert.unit})
                            </div>
                            <span style={{
                                ...styles.badge,
                                backgroundColor: alert.status === 'Critical' ? '#fee2e2' : '#fef3c7',
                                color: alert.status === 'Critical' ? '#dc2626' : '#d97706'
                            }}>
                                {alert.status}
                            </span>
                        </div>
                        
                        <div style={styles.detailsGrid}>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Hospital:</span>
                                <span style={styles.detailValue}>{alert.hospitalName}</span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>District:</span>
                                <span style={styles.detailValue}>{alert.district}</span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Current Stock:</span>
                                <span style={{ ...styles.detailValue, color: '#ef4444', fontWeight: 'bold' }}>
                                    {alert.currentStock} units
                                </span>
                            </div>
                            <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Est. Days Remaining:</span>
                                <span style={{ ...styles.detailValue, color: getSeverityColor(alert.severity) }}>
                                    {alert.estimatedDaysRemaining === 999 ? 'Insufficient data' : `${alert.estimatedDaysRemaining} days`}
                                </span>
                            </div>
                        </div>
                        
                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                            Severity: <span style={{ color: getSeverityColor(alert.severity), fontWeight: 'bold' }}>{alert.severity}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ShortageAlerts;