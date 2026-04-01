import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const StockAggregationTable = ({ onRefresh }) => {
    const [medicines, setMedicines] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchStockAggregation();
    }, []);

    const fetchStockAggregation = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ministry/stock-aggregation');
            setMedicines(response.data.medicines);
            setSummary(response.data.summary);
            console.log('Stock aggregation:', response.data);
        } catch (error) {
            console.error('Failed to fetch stock aggregation:', error);
            toast.error('Failed to load stock data');
        } finally {
            setLoading(false);
        }
    };

    const filteredMedicines = medicines.filter(med =>
        med.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const styles = {
        container: { padding: '10px' },
        searchBar: {
            display: 'flex',
            gap: '15px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        searchInput: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            flex: 1,
            minWidth: '250px'
        },
        summaryCards: {
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        summaryCard: {
            backgroundColor: '#f8fafc',
            padding: '15px',
            borderRadius: '8px',
            flex: 1,
            minWidth: '150px',
            textAlign: 'center'
        },
        summaryValue: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#3b82f6'
        },
        summaryLabel: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '5px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '10px'
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
        stockBadge: {
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

    const getStockStatus = (quantity) => {
        if (quantity === 0) return { bg: '#fee2e2', color: '#dc2626', text: 'Out of Stock' };
        if (quantity < 10000) return { bg: '#fef3c7', color: '#d97706', text: 'Low National Stock' };
        return { bg: '#d1fae5', color: '#10b981', text: 'Adequate' };
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading stock data...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>National Stock Aggregation</h2>
                <button onClick={fetchStockAggregation} style={styles.refreshButton}>
                    🔄 Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div style={styles.summaryCards}>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{summary.totalMedicines || 0}</div>
                    <div style={styles.summaryLabel}>Medicine Types</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{(summary.totalUnits || 0).toLocaleString()}</div>
                    <div style={styles.summaryLabel}>Total Units Nationwide</div>
                </div>
                <div style={styles.summaryCard}>
                    <div style={styles.summaryValue}>{Math.round(summary.avgPerMedicine || 0).toLocaleString()}</div>
                    <div style={styles.summaryLabel}>Average per Medicine</div>
                </div>
            </div>

            {/* Search */}
            <div style={styles.searchBar}>
                <input
                    type="text"
                    placeholder="Search medicine by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                />
            </div>

            {/* Table */}
            {filteredMedicines.length === 0 ? (
                <div style={styles.emptyState}>No medicines found</div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>Medicine</th>
                                <th style={styles.th}>Strength</th>
                                <th style={styles.th}>Total Units</th>
                                <th style={styles.th}>Hospitals</th>
                                <th style={styles.th}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMedicines.map((medicine, idx) => {
                                const status = getStockStatus(medicine.totalQuantity);
                                return (
                                    <tr key={idx}>
                                        <td style={styles.td}>
                                            <strong>{medicine.medicineName}</strong>
                                        </td>
                                        <td style={styles.td}>
                                            {medicine.weight}{medicine.unit}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: 'bold', color: medicine.totalQuantity < 10000 ? '#f59e0b' : '#10b981' }}>
                                                {medicine.totalQuantity.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            {medicine.hospitalCount} hospitals
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.stockBadge,
                                                backgroundColor: status.bg,
                                                color: status.color
                                            }}>
                                                {status.text}
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

export default StockAggregationTable;