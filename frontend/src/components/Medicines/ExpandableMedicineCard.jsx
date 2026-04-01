import React, { useState } from 'react';

const ExpandableMedicineCard = ({ medicine, onAddToWatchlist, user }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const styles = {
        card: {
            backgroundColor: 'white',
            borderRadius: '12px',
            marginBottom: '16px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            border: medicine.hasStockInDistrict ? '1px solid #e5e7eb' : '2px solid #fef3c7'
        },
        header: {
            padding: '16px 20px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            backgroundColor: medicine.hasStockInDistrict ? 'white' : '#fffbeb'
        },
        medicineInfo: {
            flex: 1
        },
        medicineName: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        strength: {
            fontSize: '14px',
            color: '#64748b',
            marginTop: '4px'
        },
        stockStatus: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        stockBadge: {
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '500'
        },
        inStockBadge: {
            backgroundColor: '#d1fae5',
            color: '#10b981'
        },
        outOfStockBadge: {
            backgroundColor: '#fee2e2',
            color: '#dc2626'
        },
        expandIcon: {
            fontSize: '20px',
            color: '#64748b',
            transition: 'transform 0.3s'
        },
        expandIconExpanded: {
            transform: 'rotate(180deg)'
        },
        details: {
            padding: '20px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
        },
        noStockMessage: {
            backgroundColor: '#fef3c7',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            borderLeft: '4px solid #f59e0b'
        },
        noStockIcon: {
            fontSize: '48px',
            marginBottom: '12px'
        },
        noStockTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#92400e',
            marginBottom: '8px'
        },
        noStockText: {
            fontSize: '14px',
            color: '#b45309',
            marginBottom: '16px'
        },
        watchlistButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s',
            marginTop: '8px'
        },
        stockTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '12px',
            marginBottom: '20px'
        },
        th: {
            textAlign: 'left',
            padding: '12px',
            backgroundColor: '#f3f4f6',
            fontSize: '13px',
            fontWeight: '600',
            color: '#374151'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px'
        },
        quantityAvailable: {
            fontWeight: 'bold',
            color: '#10b981'
        },
        availableHeader: {
            marginBottom: '12px',
            fontWeight: '500',
            color: '#10b981',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        actionSection: {
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center'
        }
    };

    return (
        <div style={styles.card}>
            <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
                <div style={styles.medicineInfo}>
                    <div style={styles.medicineName}>{medicine.medicineName}</div>
                    <div style={styles.strength}>
                        {medicine.weight}{medicine.unit}
                    </div>
                </div>
                <div style={styles.stockStatus}>
                    <span style={{
                        ...styles.stockBadge,
                        ...(medicine.hasStockInDistrict ? styles.inStockBadge : styles.outOfStockBadge)
                    }}>
                        {medicine.hasStockInDistrict 
                            ? `✓ ${medicine.totalAvailable} units available` 
                            : '✗ Currently unavailable'}
                    </span>
                    <span style={{
                        ...styles.expandIcon,
                        ...(isExpanded && styles.expandIconExpanded)
                    }}>
                        ▼
                    </span>
                </div>
            </div>
            
            {isExpanded && (
                <div style={styles.details}>
                    {!medicine.hasStockInDistrict ? (
                        // Unavailable medicine - clean message with watchlist button
                        <div style={styles.noStockMessage}>
                            <div style={styles.noStockIcon}>🏥</div>
                            <div style={styles.noStockTitle}>
                                Not Available in Selected District
                            </div>
                            <div style={styles.noStockText}>
                                {medicine.medicineName} ({medicine.weight}{medicine.unit}) is currently not available 
                                in any hospital in this district.
                            </div>
                            {user ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddToWatchlist(medicine);
                                    }}
                                    style={styles.watchlistButton}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                >
                                    🔔 Add to Watchlist
                                </button>
                            ) : (
                                <div style={{ fontSize: '13px', color: '#92400e', marginTop: '8px' }}>
                                    🔒 <strong>Login</strong> to add this medicine to your watchlist and get notified when stock becomes available.
                                </div>
                            )}
                        </div>
                    ) : (
                        // Available medicine - show stock details with single watchlist button at bottom
                        <>
                            <div style={styles.availableHeader}>
                                ✅ Available in {medicine.stocks.length} hospital(s):
                            </div>
                            <table style={styles.stockTable}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Hospital</th>
                                        <th style={styles.th}>Available Quantity</th>
                                        <th style={styles.th}>Last Updated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {medicine.stocks.map((stock, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.td}>
                                                <strong>{stock.hospitalName}</strong>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={styles.quantityAvailable}>
                                                    {stock.availableQuantity} units
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                {new Date(stock.lastUpdated).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            {/* Single Watchlist Button for the Medicine */}
                            <div style={styles.actionSection}>
                                {user ? (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAddToWatchlist(medicine);
                                        }}
                                        style={styles.watchlistButton}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
                                    >
                                        📋 Add to My Watchlist
                                    </button>
                                ) : (
                                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                        🔒 <strong>Login</strong> to add this medicine to your watchlist
                                    </div>
                                )}
                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '8px' }}>
                                    Add to watchlist to track stock availability and get notifications
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExpandableMedicineCard;