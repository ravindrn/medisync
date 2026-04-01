import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const WatchlistTable = ({ watchlist, onUpdateQuantity, onRemove, userDistrict, onRefresh }) => {
    const [editingId, setEditingId] = useState(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [notifying, setNotifying] = useState(null);

    // Auto-refresh watchlist every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            if (onRefresh) {
                console.log('Auto-refreshing watchlist...');
                onRefresh();
            }
        }, 30000);
        
        return () => clearInterval(interval);
    }, [onRefresh]);

    const startEdit = (item) => {
        setEditingId(item._id);
        setEditQuantity(item.quantityNeeded.toString());
    };

    const saveEdit = async (id) => {
        const quantity = parseInt(editQuantity);
        if (quantity > 0) {
            await onUpdateQuantity(id, quantity);
            setEditingId(null);
            if (onRefresh) onRefresh();
        }
    };

   const handleNotifyMe = async (item) => {
    setNotifying(item._id);
    try {
        console.log('Sending notification request for:', {
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            district: item.district || userDistrict,
            quantityNeeded: item.quantityNeeded,
            currentStock: item.totalAvailable
        });
        
        const response = await api.post('/medicines/notify', {
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            weight: item.weight,
            unit: item.unit,
            district: item.district || userDistrict,
            quantityNeeded: item.quantityNeeded
        });
        
        if (response.data.success) {
            toast.success(response.data.message);
        } else {
            toast.error(response.data.message || 'Failed to request notification');
        }
        
        // Refresh watchlist to update the button state
        if (onRefresh) await onRefresh();
        
    } catch (error) {
        console.error('Notify error:', error);
        toast.error(error.response?.data?.message || 'Failed to request notification');
    } finally {
        setNotifying(null);
    }
};

    const getStatusStyle = (totalAvailable, quantityNeeded) => {
        if (totalAvailable === 0 || totalAvailable === undefined) {
            return { background: '#fee2e2', color: '#dc2626', text: 'Out of Stock' };
        }
        if (totalAvailable >= quantityNeeded) {
            return { background: '#d1fae5', color: '#10b981', text: 'Sufficient Stock' };
        }
        return { background: '#fef3c7', color: '#d97706', text: 'Low Stock' };
    };

    const shouldShowNotifyButton = (totalAvailable, quantityNeeded) => {
        return totalAvailable < quantityNeeded;
    };

    const styles = {
        container: {
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'auto',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        },
        refreshHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb'
        },
        refreshInfo: {
            fontSize: '12px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        refreshButton: {
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        },
        districtInfo: {
            backgroundColor: '#e0f2fe',
            padding: '15px',
            marginBottom: '15px',
            borderRadius: '8px',
            borderLeft: '4px solid #0284c7',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        districtText: {
            color: '#0369a1',
            fontSize: '14px',
            fontWeight: '500'
        },
        districtBadge: {
            backgroundColor: '#0284c7',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '700px'
        },
        th: {
            padding: '16px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            color: '#1e293b',
            borderBottom: '2px solid #e5e7eb'
        },
        td: {
            padding: '16px',
            borderBottom: '1px solid #e5e7eb',
            verticalAlign: 'top'
        },
        statusBadge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        editButton: {
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '8px',
            fontSize: '12px'
        },
        deleteButton: {
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        saveButton: {
            padding: '6px 12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginRight: '8px',
            fontSize: '12px'
        },
        cancelButton: {
            padding: '6px 12px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        notifyButton: {
            padding: '6px 12px',
            backgroundColor: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            marginTop: '8px',
            width: '100%'
        },
        notifyButtonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        },
        input: {
            width: '80px',
            padding: '6px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px'
        },
        actionContainer: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        stockInfo: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
        },
        medicineName: {
            fontWeight: 'bold',
            marginBottom: '4px'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.refreshHeader}>
                <div style={styles.refreshInfo}>
                    <span>🔄 Auto-refresh every 30 seconds</span>
                </div>
                <button onClick={() => onRefresh && onRefresh()} style={styles.refreshButton}>
                    🔄 Refresh Now
                </button>
            </div>

            <div style={styles.districtInfo}>
                <div style={styles.districtText}>
                    <span style={{ marginRight: '8px' }}>📍</span>
                    Stock availability shown is based on your registered district:
                </div>
                <div style={styles.districtBadge}>
                    {userDistrict || 'Not set'}
                </div>
            </div>
            
            <table style={styles.table}>
                <thead>
                    <tr>
                        <th style={styles.th}>Medicine</th>
                        <th style={styles.th}>Strength</th>
                        <th style={styles.th}>Quantity Needed</th>
                        <th style={styles.th}>Available Stock</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {watchlist && watchlist.length > 0 ? (
                        watchlist.map((item) => {
                            const totalAvailable = item.totalAvailable || 0;
                            const quantityNeeded = item.quantityNeeded || 1;
                            const statusStyle = getStatusStyle(totalAvailable, quantityNeeded);
                            const showNotifyButton = shouldShowNotifyButton(totalAvailable, quantityNeeded);
                            
                            return (
                                <tr key={item._id}>
                                    <td style={styles.td}>
                                        <div style={styles.medicineName}>{item.medicineName}</div>
                                        {showNotifyButton && (
                                            <div style={styles.stockInfo}>
                                                {totalAvailable === 0 ? (
                                                    <span>⚠️ Currently unavailable - Request notification</span>
                                                ) : (
                                                    <span>⚠️ Need {quantityNeeded - totalAvailable} more units</span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        {item.weight}{item.unit}
                                    </td>
                                    <td style={styles.td}>
                                        {editingId === item._id ? (
                                            <input
                                                type="number"
                                                min="1"
                                                value={editQuantity}
                                                onChange={(e) => setEditQuantity(e.target.value)}
                                                style={styles.input}
                                                autoFocus
                                            />
                                        ) : (
                                            <span>{item.quantityNeeded} units</span>
                                        )}
                                    </td>
                                    <td style={styles.td}>
                                        <strong style={{
                                            color: totalAvailable === 0 ? '#dc2626' : 
                                                    totalAvailable < quantityNeeded ? '#d97706' : '#10b981'
                                        }}>
                                            {totalAvailable} units
                                        </strong>
                                    </td>
                                    <td style={styles.td}>
                                        <span style={{
                                            ...styles.statusBadge,
                                            backgroundColor: statusStyle.background,
                                            color: statusStyle.color
                                        }}>
                                            {statusStyle.text}
                                        </span>
                                    </td>
                                    <td style={styles.td}>
                                        <div style={styles.actionContainer}>
                                            <div>
                                                {editingId === item._id ? (
                                                    <>
                                                        <button onClick={() => saveEdit(item._id)} style={styles.saveButton}>
                                                            ✓ Save
                                                        </button>
                                                        <button onClick={() => setEditingId(null)} style={styles.cancelButton}>
                                                            ✗ Cancel
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(item)} style={styles.editButton}>
                                                            ✎ Edit
                                                        </button>
                                                        <button onClick={() => onRemove(item._id)} style={styles.deleteButton}>
                                                            🗑 Delete
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                            
                                            {showNotifyButton && (
                                                <button
                                                    onClick={() => handleNotifyMe(item)}
                                                    disabled={notifying === item._id}
                                                    style={{
                                                        ...styles.notifyButton,
                                                        ...(notifying === item._id ? styles.notifyButtonDisabled : {})
                                                    }}
                                                >
                                                    {notifying === item._id ? 'Requesting...' : '🔔 Notify Me When Available'}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    ) : (
                        <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                No items in watchlist
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default WatchlistTable;