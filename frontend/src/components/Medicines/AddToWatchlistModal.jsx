import React, { useState } from 'react';

const AddToWatchlistModal = ({ isOpen, onClose, medicine, onConfirm, userDistrict }) => {
    const [quantity, setQuantity] = useState(1);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (medicine && medicine._id) {
            onConfirm(medicine._id, quantity);
            onClose();
        }
    };

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: '#1e293b'
        },
        medicineName: {
            fontSize: '18px',
            fontWeight: '500',
            color: '#3b82f6',
            marginBottom: '8px'
        },
        strength: {
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '20px'
        },
        districtInfo: {
            backgroundColor: '#e0f2fe',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#0369a1',
            borderLeft: '3px solid #0284c7'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#374151'
        },
        input: {
            width: '100%',
            padding: '10px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '16px',
            marginBottom: '20px'
        },
        buttonContainer: {
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
        },
        cancelButton: {
            padding: '8px 16px',
            backgroundColor: '#e5e7eb',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
        },
        confirmButton: {
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3 style={styles.title}>Add to Watchlist</h3>
                <div style={styles.medicineName}>{medicine?.medicineName}</div>
                <div style={styles.strength}>
                    Strength: {medicine?.weight}{medicine?.unit}
                </div>
                
                <div style={styles.districtInfo}>
                    <span style={{ fontSize: '16px', marginRight: '8px' }}>📍</span>
                    <strong>Stock availability will be shown for your registered district:</strong>
                    <div style={{ 
                        marginTop: '8px', 
                        fontWeight: 'bold', 
                        fontSize: '14px',
                        backgroundColor: '#0284c7',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        display: 'inline-block'
                    }}>
                        {userDistrict || 'Not set'}
                    </div>
                </div>
                
                <label style={styles.label}>Quantity Needed:</label>
                <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    style={styles.input}
                />
                <div style={styles.buttonContainer}>
                    <button onClick={onClose} style={styles.cancelButton}>
                        Cancel
                    </button>
                    <button onClick={handleConfirm} style={styles.confirmButton}>
                        Add to Watchlist
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddToWatchlistModal;