// HospitalStockView.jsx - Simplified version without arrival button
import React, { useState } from 'react';

const HospitalStockView = ({ stock, hospital, onRequestTransfer, onNotifyStockArrival }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const filteredStock = stock.filter(item => {
        const matchesSearch = item.medicineName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ? true :
                              filterStatus === 'low' ? (item.availableQuantity < 50 && item.availableQuantity > 0) :
                              filterStatus === 'out' ? item.availableQuantity === 0 :
                              filterStatus === 'available' ? item.availableQuantity >= 50 : true;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (quantity) => {
        if (quantity === 0) {
            return { bg: '#fee2e2', color: '#dc2626', text: 'Out of Stock' };
        }
        if (quantity < 10) {
            return { bg: '#fee2e2', color: '#dc2626', text: 'Critical' };
        }
        if (quantity < 50) {
            return { bg: '#fef3c7', color: '#d97706', text: 'Low Stock' };
        }
        return { bg: '#d1fae5', color: '#10b981', text: 'Available' };
    };

    const styles = {
        container: { padding: '10px' },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '20px'
        },
        title: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b' },
        filters: { display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' },
        searchInput: {
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            width: '250px'
        },
        filterSelect: {
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        transferButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.2s'
        },
        arrivalButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginRight: '10px',
            transition: 'background-color 0.2s'
        },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: {
            padding: '12px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb'
        },
        td: { padding: '12px', borderBottom: '1px solid #e5e7eb', verticalAlign: 'middle' },
        badge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        noResults: { textAlign: 'center', padding: '40px', color: '#6b7280' },
        actionCell: { whiteSpace: 'nowrap' }
    };

    const stats = {
        total: stock.length,
        available: stock.filter(m => m.availableQuantity >= 50).length,
        low: stock.filter(m => m.availableQuantity < 50 && m.availableQuantity > 0).length,
        out: stock.filter(m => m.availableQuantity === 0).length
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <div style={styles.title}>📋 Medicine Stock Inventory</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '5px' }}>
                        Total: {stats.total} | Available: {stats.available} | Low Stock: {stats.low} | Out: {stats.out}
                    </div>
                </div>
                <div style={styles.filters}>
                    <input
                        type="text"
                        placeholder="Search medicine..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={styles.searchInput}
                    />
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        style={styles.filterSelect}
                    >
                        <option value="all">All Status</option>
                        <option value="available">Available</option>
                        <option value="low">Low Stock</option>
                        <option value="out">Out of Stock</option>
                    </select>
                    <button 
                        onClick={() => onNotifyStockArrival && onNotifyStockArrival()} 
                        style={styles.arrivalButton}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
                    >
                        📦 Report Stock Arrival
                    </button>
                    <button 
                        onClick={() => onRequestTransfer && onRequestTransfer()} 
                        style={styles.transferButton}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                    >
                        🔄 Request from Other Hospitals
                    </button>
                </div>
            </div>

            {filteredStock.length === 0 ? (
                <div style={styles.noResults}>
                    {searchTerm || filterStatus !== 'all' ? 'No medicines found matching your filters' : 
                     'No medicines in stock. Click "Report Stock Arrival" to add new medicines!'}
                </div>
            ) : (
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Medicine</th>
                            <th style={styles.th}>Strength</th>
                            <th style={styles.th}>Available Quantity</th>
                            <th style={styles.th}>Status</th>
                            <th style={styles.th}>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStock.map((item, idx) => {
                            const badge = getStatusBadge(item.availableQuantity);
                            
                            return (
                                <tr key={idx}>
                                    <td style={styles.td}>
                                        <strong>{item.medicineName}</strong>
                                        {item.genericName && (
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                {item.genericName}
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>{item.weight}{item.unit}</td>
                                    <td style={styles.td}>
                                        <span style={{ 
                                            fontWeight: 'bold', 
                                            color: item.availableQuantity === 0 ? '#dc2626' : 
                                                   item.availableQuantity < 50 ? '#f59e0b' : '#10b981'
                                        }}>
                                            {item.availableQuantity} units
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.color }}>
                                            {badge.text}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default HospitalStockView;