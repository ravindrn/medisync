import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ExcessStockList = ({ onRefresh }) => {
    const [excessItems, setExcessItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('daysSupply');

    useEffect(() => {
        fetchExcessStock();
    }, []);

    const fetchExcessStock = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ministry/excess-stock');
            setExcessItems(response.data.excessItems);
            console.log('Excess stock:', response.data);
        } catch (error) {
            console.error('Failed to fetch excess stock:', error);
            toast.error('Failed to load excess stock data');
        } finally {
            setLoading(false);
        }
    };

    const sortedItems = [...excessItems].sort((a, b) => {
        if (sortBy === 'daysSupply') return b.daysSupply - a.daysSupply;
        if (sortBy === 'quantity') return b.currentStock - a.currentStock;
        return b.excessUnits - a.excessUnits;
    });

    const getExcessLevel = (daysSupply) => {
        if (daysSupply > 730) return { bg: '#fee2e2', color: '#dc2626', text: 'Critical Excess (2+ years)' };
        if (daysSupply > 365) return { bg: '#fef3c7', color: '#d97706', text: 'High Excess (1-2 years)' };
        return { bg: '#d1fae5', color: '#10b981', text: 'Moderate Excess' };
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
            fontWeight: 'bold',
            color: '#f59e0b'
        },
        sortButtons: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        sortButton: {
            padding: '6px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '13px'
        },
        activeSort: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderColor: '#3b82f6'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '10px',
            overflowX: 'auto'
        },
        th: {
            padding: '12px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb',
            cursor: 'pointer'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #e5e7eb'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
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

    const totalExcessItems = excessItems.length;
    const totalExcessUnits = excessItems.reduce((sum, item) => sum + item.excessUnits, 0);
    const avgExcess = totalExcessItems > 0 ? Math.round(totalExcessUnits / totalExcessItems) : 0;

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading excess stock data...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>📦 Excess Stock Identification</h2>
                <button onClick={fetchExcessStock} style={styles.refreshButton}>
                    🔄 Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsCards}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{totalExcessItems}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Items with Excess Stock</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{totalExcessUnits.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Excess Units</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{avgExcess.toLocaleString()}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg Excess per Item</div>
                </div>
            </div>

            {/* Sort Options */}
            <div style={styles.sortButtons}>
                <button
                    onClick={() => setSortBy('daysSupply')}
                    style={{ ...styles.sortButton, ...(sortBy === 'daysSupply' ? styles.activeSort : {}) }}
                >
                    Sort by Days Supply
                </button>
                <button
                    onClick={() => setSortBy('quantity')}
                    style={{ ...styles.sortButton, ...(sortBy === 'quantity' ? styles.activeSort : {}) }}
                >
                    Sort by Quantity
                </button>
                <button
                    onClick={() => setSortBy('excess')}
                    style={{ ...styles.sortButton, ...(sortBy === 'excess' ? styles.activeSort : {}) }}
                >
                    Sort by Excess Units
                </button>
            </div>

            {/* Table */}
            {sortedItems.length === 0 ? (
                <div style={styles.emptyState}>No excess stock found</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Medicine</th>
                                <th style={styles.th}>Strength</th>
                                <th style={styles.th}>Hospital</th>
                                <th style={styles.th}>District</th>
                                <th style={styles.th}>Current Stock</th>
                                <th style={styles.th}>Daily Usage</th>
                                <th style={styles.th}>Days Supply</th>
                                <th style={styles.th}>Excess Units</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                            </thead>
                        <tbody>
                            {sortedItems.map((item, idx) => {
                                const excessLevel = getExcessLevel(item.daysSupply);
                                return (
                                    <tr key={idx}>
                                        <td style={styles.td}>
                                            <strong>{item.medicineName}</strong>
                                        </td>
                                        <td style={styles.td}>{item.weight}{item.unit}</td>
                                        <td style={styles.td}>{item.hospitalName}</td>
                                        <td style={styles.td}>{item.district}</td>
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                                                {item.currentStock.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={styles.td}>{item.dailyUsage} units/day</td>
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: 'bold' }}>
                                                {item.daysSupply} days
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                                                {item.excessUnits.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.badge,
                                                backgroundColor: excessLevel.bg,
                                                color: excessLevel.color
                                            }}>
                                                {excessLevel.text}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ExcessStockList;