import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const PendingDeliveries = () => {
    const [pendingDonations, setPendingDonations] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmingId, setConfirmingId] = useState(null);
    const [managerNotes, setManagerNotes] = useState('');

    useEffect(() => {
        fetchPendingDeliveries();
    }, []);

    const fetchPendingDeliveries = async () => {
        setLoading(true);
        try {
            const response = await api.get('/donor/manager/pending');
            setHospital(response.data.hospital);
            setPendingDonations(response.data.donations);
        } catch (error) {
            console.error('Failed to fetch pending deliveries:', error);
            toast.error('Failed to load pending deliveries');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (donationId) => {
        if (!window.confirm('Have you received all the medicines? This action cannot be undone.')) {
            return;
        }

        setConfirmingId(donationId);
        try {
            await api.put(`/donor/manager/confirm/${donationId}`, { notes: managerNotes });
            toast.success('Donation receipt confirmed! Admin will complete the process.');
            setManagerNotes('');
            fetchPendingDeliveries();
        } catch (error) {
            console.error('Failed to confirm donation:', error);
            toast.error(error.response?.data?.message || 'Failed to confirm donation');
        } finally {
            setConfirmingId(null);
        }
    };

    const styles = {
        container: {
            padding: '20px'
        },
        header: {
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
        },
        donationCard: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        donorInfo: {
            backgroundColor: '#fef3c7',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px'
        },
        itemsList: {
            marginTop: '12px'
        },
        itemRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb'
        },
        confirmButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            marginTop: '16px',
            width: '100%'
        },
        notesInput: {
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            marginTop: '12px',
            fontSize: '14px'
        },
        emptyState: {
            textAlign: 'center',
            padding: '60px',
            backgroundColor: 'white',
            borderRadius: '12px',
            color: '#6b7280'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            {hospital && (
                <div style={styles.header}>
                    <h2>🏥 {hospital.name}</h2>
                    <p>Pending Deliveries - {hospital.district} District</p>
                </div>
            )}

            {pendingDonations.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <h3>No Pending Deliveries</h3>
                    <p>You don't have any donations waiting for confirmation.</p>
                </div>
            ) : (
                pendingDonations.map(donation => (
                    <div key={donation._id} style={styles.donationCard}>
                        <div style={styles.donorInfo}>
                            <strong>Donor:</strong> {donation.donorName}
                            <div style={{ fontSize: '12px', color: '#92400e', marginTop: '4px' }}>
                                📞 {donation.donorPhone || 'No phone provided'} | 📧 {donation.donorEmail}
                            </div>
                        </div>

                        <div>
                            <strong>📦 Items to Receive:</strong>
                            <div style={styles.itemsList}>
                                {donation.items.map((item, idx) => (
                                    <div key={idx} style={styles.itemRow}>
                                        <span>{item.medicineName} ({item.weight}{item.unit})</span>
                                        <span>{item.quantity} units</span>
                                    </div>
                                ))}
                                <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
                                    Total: {donation.totalItems} items ({donation.totalQuantity} units)
                                </div>
                            </div>
                        </div>

                        {donation.deliveryLocation && (
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '6px', fontSize: '13px' }}>
                                <strong>📍 Delivery Location:</strong> {donation.deliveryLocation}
                                {donation.deliveryDate && (
                                    <div>📅 Expected Date: {new Date(donation.deliveryDate).toLocaleDateString()}</div>
                                )}
                            </div>
                        )}

                        {donation.notes && (
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '13px' }}>
                                <strong>📝 Donor Notes:</strong> {donation.notes}
                            </div>
                        )}

                        <textarea
                            placeholder="Optional: Add notes about the delivery (e.g., condition, any issues)"
                            value={managerNotes}
                            onChange={(e) => setManagerNotes(e.target.value)}
                            style={styles.notesInput}
                            rows="2"
                        />

                        <button
                            onClick={() => handleConfirm(donation._id)}
                            disabled={confirmingId === donation._id}
                            style={styles.confirmButton}
                        >
                            {confirmingId === donation._id ? 'Confirming...' : '✅ Confirm Receipt'}
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default PendingDeliveries;