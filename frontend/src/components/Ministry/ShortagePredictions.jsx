import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ShortagePredictions = ({ onRefresh }) => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchPredictions();
    }, []);

    const fetchPredictions = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ministry/predict-shortages');
            setPredictions(response.data.predictions);
            console.log('Predictions:', response.data);
        } catch (error) {
            console.error('Failed to fetch predictions:', error);
            toast.error('Failed to load prediction data');
        } finally {
            setLoading(false);
        }
    };

    const filteredPredictions = predictions.filter(pred => {
        if (filter === 'critical') return pred.severity === 'Critical';
        if (filter === 'high') return pred.severity === 'High';
        if (filter === 'medium') return pred.severity === 'Medium';
        return true;
    });

    const getSeverityColor = (severity) => {
        if (severity === 'Critical') return '#dc2626';
        if (severity === 'High') return '#f59e0b';
        return '#10b981';
    };

    const getSeverityIcon = (severity) => {
        if (severity === 'Critical') return '🔴';
        if (severity === 'High') return '🟠';
        return '🟡';
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown';
        return new Date(date).toLocaleDateString();
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
        filterButtons: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap'
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
        predictionCard: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '15px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s'
        },
        predictionHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        medicineName: {
            fontSize: '18px',
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
        countdownBar: {
            backgroundColor: '#e5e7eb',
            borderRadius: '8px',
            height: '8px',
            marginTop: '10px',
            overflow: 'hidden'
        },
        countdownFill: {
            height: '100%',
            borderRadius: '8px',
            transition: 'width 0.5s'
        },
        detailsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginTop: '15px'
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

    const criticalCount = predictions.filter(p => p.severity === 'Critical').length;
    const highCount = predictions.filter(p => p.severity === 'High').length;
    const mediumCount = predictions.filter(p => p.severity === 'Medium').length;

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Generating predictions...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>🔮 Shortage Predictions</h2>
                <button onClick={fetchPredictions} style={styles.refreshButton}>
                    🔄 Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsCards}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#ef4444' }}>{predictions.length}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Predictions</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#dc2626' }}>{criticalCount}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Critical ({"<"}7 days)</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#f59e0b' }}>{highCount}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>High (7-14 days)</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{mediumCount}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Medium (14-30 days)</div>
                </div>
            </div>

            {/* Filters */}
            <div style={styles.filterButtons}>
                <button
                    onClick={() => setFilter('all')}
                    style={{ ...styles.filterButton, ...(filter === 'all' ? styles.activeFilter : {}) }}
                >
                    All ({predictions.length})
                </button>
                <button
                    onClick={() => setFilter('critical')}
                    style={{ ...styles.filterButton, ...(filter === 'critical' ? styles.activeFilter : {}) }}
                >
                    Critical ({criticalCount})
                </button>
                <button
                    onClick={() => setFilter('high')}
                    style={{ ...styles.filterButton, ...(filter === 'high' ? styles.activeFilter : {}) }}
                >
                    High ({highCount})
                </button>
                <button
                    onClick={() => setFilter('medium')}
                    style={{ ...styles.filterButton, ...(filter === 'medium' ? styles.activeFilter : {}) }}
                >
                    Medium ({mediumCount})
                </button>
            </div>

            {/* Predictions List */}
            {filteredPredictions.length === 0 ? (
                <div style={styles.emptyState}>No shortage predictions found</div>
            ) : (
                filteredPredictions.map((pred, idx) => {
                    const severityColor = getSeverityColor(pred.severity);
                    const daysRemaining = pred.daysRemaining;
                    const percentageRemaining = (daysRemaining / 30) * 100;
                    const fillColor = daysRemaining < 7 ? '#dc2626' : daysRemaining < 14 ? '#f59e0b' : '#10b981';
                    
                    return (
                        <div key={idx} style={styles.predictionCard}>
                            <div style={styles.predictionHeader}>
                                <div>
                                    <div style={styles.medicineName}>
                                        {getSeverityIcon(pred.severity)} {pred.medicineName} ({pred.weight}{pred.unit})
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        {pred.hospitalName} • {pred.district}
                                    </div>
                                </div>
                                <span style={{
                                    ...styles.badge,
                                    backgroundColor: severityColor + '20',
                                    color: severityColor
                                }}>
                                    {pred.severity} Risk
                                </span>
                            </div>

                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>Days Remaining:</span>
                                    <span style={{ fontWeight: 'bold', color: fillColor }}>{daysRemaining} days</span>
                                </div>
                                <div style={styles.countdownBar}>
                                    <div style={{
                                        ...styles.countdownFill,
                                        width: `${Math.min(percentageRemaining, 100)}%`,
                                        backgroundColor: fillColor
                                    }}></div>
                                </div>
                            </div>

                            <div style={styles.detailsGrid}>
                                <div style={styles.detailItem}>
                                    <span style={styles.detailLabel}>Current Stock:</span>
                                    <span style={styles.detailValue}>{pred.currentStock} units</span>
                                </div>
                                <div style={styles.detailItem}>
                                    <span style={styles.detailLabel}>Daily Usage:</span>
                                    <span style={styles.detailValue}>{pred.dailyUsage} units/day</span>
                                </div>
                                <div style={styles.detailItem}>
                                    <span style={styles.detailLabel}>Predicted Shortage Date:</span>
                                    <span style={styles.detailValue}>{formatDate(pred.predictedShortageDate)}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '12px' }}>
                                ⚠️ <strong>Action Required:</strong> This medicine is predicted to run out in {daysRemaining} days. 
                                {daysRemaining < 7 ? ' Immediate action recommended!' : ' Plan restocking soon.'}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default ShortagePredictions;