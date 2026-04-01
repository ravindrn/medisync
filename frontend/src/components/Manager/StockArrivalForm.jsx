import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '16px',
        maxWidth: '800px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto'
    }
};

const StockArrivalForm = ({ hospital, onSuccess, isOpen, onClose }) => {
    const [medicines, setMedicines] = useState([]);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState('');

    if (isOpen !== undefined) {
        if (!isOpen) return null;

        return (
            <div style={modalStyles.overlay} onClick={onClose}>
                <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                    <StockArrivalFormContent
                        hospital={hospital}
                        onSuccess={onSuccess}
                        onClose={onClose}
                        medicines={medicines}
                        setMedicines={setMedicines}
                        loading={loading}
                        setLoading={setLoading}
                        notes={notes}
                        setNotes={setNotes}
                    />
                </div>
            </div>
        );
    }

    return (
        <StockArrivalFormContent
            hospital={hospital}
            onSuccess={onSuccess}
            medicines={medicines}
            setMedicines={setMedicines}
            loading={loading}
            setLoading={setLoading}
            notes={notes}
            setNotes={setNotes}
        />
    );
};

const StockArrivalFormContent = ({
    hospital,
    onSuccess,
    onClose,
    medicines,
    setMedicines,
    loading,
    setLoading,
    notes,
    setNotes
}) => {
    const addMedicine = () => {
        setMedicines([
            ...medicines,
            {
                id: Date.now() + Math.random(),
                medicineName: '',
                weight: '',
                unit: 'mg',
                quantity: '',
                batchNumber: '',
                expiryDate: ''
            }
        ]);
    };

    const removeMedicine = (id) => {
        setMedicines(medicines.filter((m) => m.id !== id));
    };

    const updateMedicine = (id, field, value) => {
        setMedicines(
            medicines.map((m) =>
                m.id === id ? { ...m, [field]: value } : m
            )
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!hospital?._id) {
            toast.error('Hospital data not found');
            return;
        }

        if (medicines.length === 0) {
            toast.error('Please add at least one medicine');
            return;
        }

        for (let med of medicines) {
            if (!med.medicineName.trim()) {
                toast.error('Please enter medicine name for all entries');
                return;
            }
            if (!med.weight || Number(med.weight) <= 0) {
                toast.error('Please enter valid strength for all medicines');
                return;
            }
            if (!med.quantity || Number(med.quantity) <= 0) {
                toast.error('Please enter valid quantity for all medicines');
                return;
            }
        }

        setLoading(true);

        try {
            const arrivalData = {
                hospitalId: hospital._id,
                hospitalName: hospital.name,
                hospitalDistrict: hospital.district,
                medicines: medicines.map((m) => ({
                    medicineName: m.medicineName.trim(),
                    weight: parseFloat(m.weight),
                    unit: m.unit,
                    quantity: parseInt(m.quantity),
                    batchNumber: m.batchNumber?.trim() || '',
                    expiryDate: m.expiryDate || null
                })),
                notes: notes?.trim() || '',
                arrivalDate: new Date().toISOString()
            };

            const response = await api.post('/stock-arrivals/bulk-notify', arrivalData);

            toast.success('✅ Stock arrival notification sent to admin!');
            toast.success(`📧 ${response.data.medicinesCount} medicine(s) submitted`);

            setMedicines([]);
            setNotes('');

            if (onSuccess) onSuccess();
            if (onClose) onClose();
        } catch (error) {
            console.error('Failed to send stock arrival notification:', error);
            toast.error(error.response?.data?.message || 'Failed to send notification');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            maxHeight: '80vh',
            overflowY: 'auto'
        },
        header: {
            marginBottom: '20px',
            borderBottom: '2px solid #e5e7eb',
            paddingBottom: '15px'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        subtitle: {
            fontSize: '14px',
            color: '#6b7280',
            marginTop: '5px'
        },
        addButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
        },
        medicineCard: {
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            position: 'relative'
        },
        removeButton: {
            position: 'absolute',
            top: '10px',
            right: '10px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        },
        label: {
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151'
        },
        input: {
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px'
        },
        strengthGroup: {
            display: 'flex',
            gap: '8px'
        },
        strengthInput: {
            flex: 2,
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px'
        },
        unitSelect: {
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        notesSection: {
            marginTop: '20px',
            marginBottom: '20px'
        },
        textarea: {
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '80px',
            resize: 'vertical'
        },
        submitButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            width: '100%'
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280',
            border: '2px dashed #e5e7eb',
            borderRadius: '8px',
            marginBottom: '20px'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.title}>📦 Report New Stock Arrival</div>
                <div style={styles.subtitle}>
                    You&apos;ve received new stock from suppliers? Fill in the details below and notify admin.
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <button type="button" onClick={addMedicine} style={styles.addButton}>
                    ➕ Add Medicine
                </button>

                {medicines.length === 0 ? (
                    <div style={styles.emptyState}>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📦</div>
                        <p>No medicines added yet</p>
                        <p style={{ fontSize: '13px' }}>Click &quot;Add Medicine&quot; to report new stock arrivals</p>
                    </div>
                ) : (
                    medicines.map((medicine, index) => (
                        <div key={medicine.id} style={styles.medicineCard}>
                            <button
                                type="button"
                                onClick={() => removeMedicine(medicine.id)}
                                style={styles.removeButton}
                            >
                                ✕ Remove
                            </button>

                            <h4 style={{ marginBottom: '15px', color: '#374151' }}>
                                Medicine #{index + 1}
                            </h4>

                            <div style={styles.formGrid}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Medicine Name *</label>
                                    <input
                                        type="text"
                                        value={medicine.medicineName}
                                        onChange={(e) => updateMedicine(medicine.id, 'medicineName', e.target.value)}
                                        style={styles.input}
                                        placeholder="e.g., Paracetamol, Amoxicillin"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Strength *</label>
                                    <div style={styles.strengthGroup}>
                                        <input
                                            type="number"
                                            value={medicine.weight}
                                            onChange={(e) => updateMedicine(medicine.id, 'weight', e.target.value)}
                                            style={styles.strengthInput}
                                            placeholder="500"
                                            required
                                            step="any"
                                        />
                                        <select
                                            value={medicine.unit}
                                            onChange={(e) => updateMedicine(medicine.id, 'unit', e.target.value)}
                                            style={styles.unitSelect}
                                        >
                                            <option value="mg">mg</option>
                                            <option value="g">g</option>
                                            <option value="mcg">mcg</option>
                                            <option value="ml">ml</option>
                                            <option value="IU">IU</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Quantity Received *</label>
                                    <input
                                        type="number"
                                        value={medicine.quantity}
                                        onChange={(e) => updateMedicine(medicine.id, 'quantity', e.target.value)}
                                        style={styles.input}
                                        placeholder="Number of units"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Batch Number (Optional)</label>
                                    <input
                                        type="text"
                                        value={medicine.batchNumber}
                                        onChange={(e) => updateMedicine(medicine.id, 'batchNumber', e.target.value)}
                                        style={styles.input}
                                        placeholder="e.g., BATCH-001"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Expiry Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={medicine.expiryDate}
                                        onChange={(e) => updateMedicine(medicine.id, 'expiryDate', e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                            </div>
                        </div>
                    ))
                )}

                <div style={styles.notesSection}>
                    <label style={styles.label}>Additional Notes (Optional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        style={styles.textarea}
                        placeholder="e.g., Received from supplier XYZ, urgent requirement, etc."
                    />
                </div>

                {medicines.length > 0 && (
                    <button type="submit" disabled={loading} style={styles.submitButton}>
                        {loading ? 'Sending...' : '📧 Send Stock Arrival Notification to Admin'}
                    </button>
                )}
            </form>
        </div>
    );
};

export default StockArrivalForm;