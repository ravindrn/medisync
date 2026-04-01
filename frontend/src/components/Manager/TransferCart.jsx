import React from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';

const TransferCart = ({ cartItems, onRemoveItem, onClearCart, onSendRequest, onClose }) => {
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const uniqueHospitals = [...new Set(cartItems.map(item => item.hospital._id))];
    const multipleHospitals = uniqueHospitals.length > 1;

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        header: {
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        closeButton: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            color: '#6b7280'
        },
        content: {
            flex: 1,
            overflow: 'auto',
            padding: '20px 24px'
        },
        cartItem: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '12px',
            border: '1px solid #e5e7eb'
        },
        itemHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start',
            marginBottom: '8px'
        },
        medicineName: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1f2937'
        },
        hospitalName: {
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '4px'
        },
        quantity: {
            fontSize: '14px',
            fontWeight: '500',
            color: '#10b981'
        },
        removeButton: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: '#ef4444',
            borderRadius: '6px'
        },
        warningBox: {
            backgroundColor: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#92400e'
        },
        footer: {
            padding: '20px 24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
        },
        summary: {
            fontSize: '14px',
            color: '#374151'
        },
        summaryValue: {
            fontWeight: 'bold',
            color: '#3b82f6',
            fontSize: '18px'
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px'
        },
        clearButton: {
            padding: '10px 20px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
        },
        sendButton: {
            padding: '10px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500'
        },
        sendButtonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.title}>
                        🛒 Transfer Cart
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>({cartItems.length} items)</span>
                    </div>
                    <button onClick={onClose} style={styles.closeButton}>
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                <div style={styles.content}>
                    {multipleHospitals && (
                        <div style={styles.warningBox}>
                            ⚠️ <strong>Note:</strong> You have selected medicines from {uniqueHospitals.length} different hospitals.
                            Please make sure to send separate requests for each hospital, or remove items from other hospitals.
                        </div>
                    )}

                    {cartItems.map((item, idx) => (
                        <div key={idx} style={styles.cartItem}>
                            <div style={styles.itemHeader}>
                                <div>
                                    <div style={styles.medicineName}>
                                        {item.medicine.medicineName} ({item.medicine.weight}{item.medicine.unit})
                                    </div>
                                    <div style={styles.hospitalName}>
                                        🏥 {item.hospital.name} • 📍 {item.hospital.district}
                                    </div>
                                </div>
                                <button onClick={() => onRemoveItem(idx)} style={styles.removeButton}>
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                                <span style={styles.quantity}>
                                    Quantity: {item.quantity} units
                                </span>
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Available: {item.medicine.availableQuantity} units
                                </span>
                            </div>
                        </div>
                    ))}

                    {cartItems.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            Your cart is empty. Add medicines from the hospital list to request.
                        </div>
                    )}
                </div>

                <div style={styles.footer}>
                    <div style={styles.summary}>
                        Total Items: <span style={styles.summaryValue}>{totalItems}</span> units
                        <br />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {uniqueHospitals.length} hospital(s) selected
                        </span>
                    </div>
                    <div style={styles.buttonGroup}>
                        {cartItems.length > 0 && (
                            <button onClick={onClearCart} style={styles.clearButton}>
                                Clear All
                            </button>
                        )}
                        <button
                            onClick={() => onSendRequest(cartItems)}
                            disabled={cartItems.length === 0 || multipleHospitals}
                            style={{
                                ...styles.sendButton,
                                ...((cartItems.length === 0 || multipleHospitals) ? styles.sendButtonDisabled : {})
                            }}
                        >
                            Send Request ({totalItems} units)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransferCart;