import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const DonationPledgeForm = ({ onClose, onSuccess }) => {
    const [medicines, setMedicines] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [shortages, setShortages] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [selectedHospital, setSelectedHospital] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('suggested'); // 'suggested' or 'custom'

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [medicinesRes, hospitalsRes, shortagesRes] = await Promise.all([
                api.get('/donor/medicines'),
                api.get('/donor/hospitals'),
                api.get('/donor/shortages')
            ]);
            setMedicines(medicinesRes.data);
            setHospitals(hospitalsRes.data);
            setShortages(shortagesRes.data.shortages || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoadingData(false);
        }
    };

    const addSuggestedItem = (shortage) => {
        // Add all hospitals shortage for this medicine
        shortage.hospitals.forEach(hospital => {
            const existingItem = selectedItems.find(
                item => item.medicineId === shortage.medicineId && 
                item.hospitalId === hospital.hospitalId
            );
            
            if (!existingItem) {
                setSelectedItems([
                    ...selectedItems,
                    {
                        medicineId: shortage.medicineId,
                        medicineName: shortage.medicineName,
                        weight: shortage.weight,
                        unit: shortage.unit,
                        quantity: hospital.shortageAmount,
                        hospitalId: hospital.hospitalId,
                        hospitalName: hospital.hospitalName
                    }
                ]);
            }
        });
        toast.success(`Added ${shortage.medicineName} to donation list`);
    };

    const addCustomItem = () => {
        if (!selectedMedicine) {
            toast.error('Please select a medicine');
            return;
        }
        if (!quantity || quantity < 1) {
            toast.error('Please enter a valid quantity');
            return;
        }

        const medicine = medicines.find(m => m.medicineId === selectedMedicine);
        if (!medicine) return;

        setSelectedItems([
            ...selectedItems,
            {
                medicineId: medicine.medicineId,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                quantity: parseInt(quantity)
            }
        ]);
        setSelectedMedicine('');
        setQuantity(1);
        toast.success(`Added ${medicine.medicineName} to donation list`);
    };

    const removeItem = (index) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const updateItemQuantity = (index, newQuantity) => {
        const updatedItems = [...selectedItems];
        updatedItems[index].quantity = Math.max(1, parseInt(newQuantity) || 1);
        setSelectedItems(updatedItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedItems.length === 0) {
            toast.error('Please add at least one medicine to donate');
            return;
        }
        
        if (!selectedHospital) {
            toast.error('Please select a hospital');
            return;
        }

        setLoading(true);
        try {
            await api.post('/donor/pledge', {
                items: selectedItems,
                hospitalId: selectedHospital,
                notes
            });
            
            toast.success('Donation pledge submitted! Admin will review your request.');
            onSuccess();
        } catch (error) {
            console.error('Failed to submit donation:', error);
            toast.error(error.response?.data?.message || 'Failed to submit donation');
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
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '20px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '32px'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px'
        },
        subtitle: {
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: '24px'
        },
        tabContainer: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '10px'
        },
        tab: {
            padding: '8px 16px',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: '500',
            borderRadius: '6px',
            transition: 'all 0.2s'
        },
        activeTab: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        formGroup: {
            marginBottom: '20px'
        },
        label: {
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            fontSize: '14px',
            color: '#374151'
        },
        select: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px'
        },
        addButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '8px'
        },
        shortageCard: {
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            border: '1px solid #fde68a'
        },
        itemsList: {
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px'
        },
        itemRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px',
            borderBottom: '1px solid #e5e7eb'
        },
        removeButton: {
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        submitButton: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '16px'
        },
        cancelButton: {
            width: '100%',
            padding: '12px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            marginTop: '12px'
        },
        row: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
        },
        quantityInput: {
            width: '100px',
            padding: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px'
        },
        suggestedButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        }
    };

    if (loadingData) {
        return (
            <div style={styles.overlay} onClick={onClose}>
                <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 style={styles.title}>🎁 Make a Donation Pledge</h2>
                <p style={styles.subtitle}>Choose medicines to donate and select a hospital</p>

                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Select Hospital *</label>
                        <select
                            value={selectedHospital}
                            onChange={(e) => setSelectedHospital(e.target.value)}
                            style={styles.select}
                            required
                        >
                            <option value="">Choose a hospital</option>
                            {hospitals.map(h => (
                                <option key={h._id} value={h._id}>
                                    {h.name} - {h.district}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.tabContainer}>
                        <button
                            type="button"
                            onClick={() => setActiveTab('suggested')}
                            style={{
                                ...styles.tab,
                                ...(activeTab === 'suggested' ? styles.activeTab : {})
                            }}
                        >
                            📋 Suggested Medicines (Urgent Needs)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('custom')}
                            style={{
                                ...styles.tab,
                                ...(activeTab === 'custom' ? styles.activeTab : {})
                            }}
                        >
                            ✨ Add Custom Medicines
                        </button>
                    </div>

                    {activeTab === 'suggested' && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Urgently Needed Medicines</label>
                            {shortages.length === 0 ? (
                                <p style={{ color: '#6b7280', padding: '20px', textAlign: 'center' }}>
                                    No urgent shortages at the moment.
                                </p>
                            ) : (
                                shortages.map((shortage, idx) => (
                                    <div key={idx} style={styles.shortageCard}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <strong>{shortage.medicineName}</strong>
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    {shortage.weight}{shortage.unit} | Needed: {shortage.totalShortage} units
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => addSuggestedItem(shortage)}
                                                style={styles.suggestedButton}
                                            >
                                                Add to Donation
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Add Custom Medicines</label>
                            <div style={styles.row}>
                                <select
                                    value={selectedMedicine}
                                    onChange={(e) => setSelectedMedicine(e.target.value)}
                                    style={{ ...styles.select, flex: 2 }}
                                >
                                    <option value="">Select a medicine</option>
                                    {medicines.map(m => (
                                        <option key={m.medicineId} value={m.medicineId}>
                                            {m.medicineName} ({m.weight}{m.unit})
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Quantity"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    style={styles.quantityInput}
                                    min="1"
                                />
                                <button type="button" onClick={addCustomItem} style={styles.addButton}>
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedItems.length > 0 && (
                        <div style={styles.itemsList}>
                            <strong>Your Donation Items:</strong>
                            {selectedItems.map((item, idx) => (
                                <div key={idx} style={styles.itemRow}>
                                    <div>
                                        <span style={{ fontWeight: '500' }}>
                                            {item.medicineName} ({item.weight}{item.unit})
                                        </span>
                                        {item.hospitalName && (
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                For: {item.hospitalName}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItemQuantity(idx, e.target.value)}
                                            style={{ width: '70px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                            min="1"
                                        />
                                        <span>units</span>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            style={styles.removeButton}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Notes (Optional)</label>
                        <textarea
                            rows="3"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            style={styles.input}
                            placeholder="Any special instructions or notes for the hospital..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || selectedItems.length === 0}
                        style={styles.submitButton}
                    >
                        {loading ? 'Submitting...' : 'Submit Donation Pledge'}
                    </button>
                    
                    <button
                        type="button"
                        onClick={onClose}
                        style={styles.cancelButton}
                    >
                        Cancel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default DonationPledgeForm;