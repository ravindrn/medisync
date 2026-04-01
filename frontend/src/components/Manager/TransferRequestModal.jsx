import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const TransferRequestModal = ({ isOpen, onClose, fromHospital, toHospital, medicine, onSuccess }) => {
    // Get the correct available quantity from the medicine object
    const maxQuantity = medicine?.availableQuantity || 0;
    const [quantity, setQuantity] = useState(maxQuantity > 0 ? Math.min(maxQuantity, 100) : 1);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!quantity || quantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }
        
        if (quantity > maxQuantity) {
            toast.error(`Requested quantity exceeds available stock (${maxQuantity} units)`);
            return;
        }
        
        setLoading(true);
        
        try {
            const medicineId = medicine.medicineId || medicine._id;
            
            console.log('Sending transfer request:', {
                toHospitalId: toHospital._id,
                toHospitalName: toHospital.name,
                medicineId: medicineId,
                medicineName: medicine.medicineName,
                requestedQuantity: parseInt(quantity),
                availableStock: maxQuantity,
                notes
            });
            
            const response = await api.post('/transfers/request', {
                toHospitalId: toHospital._id,
                medicines: [{
                    medicineId: medicineId,
                    requestedQuantity: parseInt(quantity)
                }],
                notes: notes
            });
            
            console.log('Transfer request response:', response.data);
            
            toast.success(`✅ Request sent to ${toHospital.name} for ${quantity} units of ${medicine.medicineName}`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Transfer request error:', error);
            console.error('Error response:', error.response?.data);
            toast.error(error.response?.data?.message || 'Failed to send request');
        } finally {
            setLoading(false);
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
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: '#1e293b'
        },
        section: {
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e5e7eb'
        },
        sectionTitle: {
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        infoRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px'
        },
        infoRowLast: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            fontSize: '14px'
        },
        label: {
            fontWeight: '500',
            color: '#6b7280'
        },
        value: {
            fontWeight: '500',
            color: '#1f2937'
        },
        stockValue: {
            fontWeight: 'bold',
            color: '#10b981',
            fontSize: '16px'
        },
        formGroup: {
            marginBottom: '15px'
        },
        inputLabel: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
            color: '#374151'
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            transition: 'border-color 0.2s'
        },
        inputFocus: {
            outline: 'none',
            borderColor: '#3b82f6',
            boxShadow: '0 0 0 3px rgba(59,130,246,0.1)'
        },
        textarea: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical',
            fontFamily: 'inherit'
        },
        buttonGroup: {
            display: 'flex',
            gap: '12px',
            marginTop: '20px'
        },
        submitButton: {
            flex: 1,
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        },
        submitButtonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        },
        cancelButton: {
            flex: 1,
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        },
        warningText: {
            fontSize: '12px',
            color: '#f59e0b',
            marginTop: '5px'
        },
        stockInfo: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px'
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.title}>📦 Request Medicine Transfer</h2>
                
                {/* From Hospital Section */}
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>
                        <span>🏥</span> From Hospital (Your Hospital)
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.label}>Hospital:</span>
                        <span style={styles.value}>{fromHospital?.name}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.label}>District:</span>
                        <span style={styles.value}>{fromHospital?.district}</span>
                    </div>
                    <div style={styles.infoRowLast}>
                        <span style={styles.label}>Phone:</span>
                        <span style={styles.value}>{fromHospital?.phone || 'N/A'}</span>
                    </div>
                </div>
                
                {/* To Hospital Section */}
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>
                        <span>🏥</span> To Hospital
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.label}>Hospital:</span>
                        <span style={styles.value}>{toHospital?.name}</span>
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.label}>District:</span>
                        <span style={styles.value}>{toHospital?.district}</span>
                    </div>
                    <div style={styles.infoRowLast}>
                        <span style={styles.label}>Phone:</span>
                        <span style={styles.value}>{toHospital?.phone || 'N/A'}</span>
                    </div>
                </div>
                
                {/* Medicine Details Section */}
                <div style={styles.section}>
                    <div style={styles.sectionTitle}>
                        <span>💊</span> Medicine Details
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.label}>Medicine:</span>
                        <span style={styles.value}><strong>{medicine?.medicineName}</strong></span>
                    </div>
                    <div style={styles.infoRow}>
                        <span style={styles.label}>Strength:</span>
                        <span style={styles.value}>{medicine?.weight}{medicine?.unit}</span>
                    </div>
                    <div style={styles.infoRowLast}>
                        <span style={styles.label}>Available Stock:</span>
                        <span style={styles.stockValue}>{maxQuantity} units</span>
                    </div>
                    {maxQuantity === 0 && (
                        <div style={styles.warningText}>
                            ⚠️ This medicine is currently out of stock at the destination hospital
                        </div>
                    )}
                </div>
                
                {/* Request Form */}
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.inputLabel}>Request Quantity *</label>
                        <input
                            type="number"
                            min="1"
                            max={maxQuantity}
                            value={quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setQuantity(isNaN(val) ? 1 : Math.min(Math.max(val, 1), maxQuantity));
                            }}
                            style={styles.input}
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                            disabled={maxQuantity === 0}
                            required
                        />
                        {maxQuantity > 0 && (
                            <div style={styles.stockInfo}>
                                Maximum available: {maxQuantity} units
                            </div>
                        )}
                    </div>
                    
                    <div style={styles.formGroup}>
                        <label style={styles.inputLabel}>Notes (Optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={styles.textarea}
                            placeholder="Add any additional notes for the receiving hospital..."
                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                            onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        />
                    </div>
                    
                    <div style={styles.buttonGroup}>
                        <button
                            type="submit"
                            disabled={loading || maxQuantity === 0}
                            style={{
                                ...styles.submitButton,
                                ...((loading || maxQuantity === 0) ? styles.submitButtonDisabled : {})
                            }}
                        >
                            {loading ? 'Sending...' : 'Send Request'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={styles.cancelButton}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransferRequestModal;