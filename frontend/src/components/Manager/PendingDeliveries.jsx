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

    // Function to send email notification to donor
    const sendDonationDeliveredEmail = async (donation, hospitalName, notes) => {
        try {
            const emailData = {
                to: donation.donorEmail,
                subject: `Donation Delivered Successfully - ${donation.donationId}`,
                message: `
                    Dear ${donation.donorName},
                    
                    Great news! Your donation has been successfully received by ${hospitalName} hospital.
                    
                    Donation Details:
                    Donation ID: ${donation.donationId}
                    Items Donated: ${donation.totalItems} medicine(s)
                    Total Quantity: ${donation.totalQuantity} units
                    
                    Delivery Confirmation Notes:
                    ${notes || 'No additional notes provided by hospital staff.'}
                    
                    Thank you for your generous contribution! Your donation is helping patients in need.
                    
                    You can download your donation certificate from your dashboard.
                    
                    Best regards,
                    ${hospitalName} Hospital Team
                    MediSync Platform
                `
            };
            
            await api.post('/notifications/send-email', emailData);
            console.log('Delivery confirmation email sent to donor:', donation.donorEmail);
            return true;
        } catch (error) {
            console.error('Failed to send email notification:', error);
            return false;
        }
    };

    // Function to send SMS notification (optional)
    const sendDonationDeliveredSMS = async (donation, hospitalName) => {
        if (donation.donorPhone) {
            try {
                const smsData = {
                    to: donation.donorPhone,
                    message: `Your donation to ${hospitalName} hospital has been delivered successfully. Thank you for your generosity! - MediSync`
                };
                await api.post('/notifications/send-sms', smsData);
                console.log('SMS sent to donor:', donation.donorPhone);
            } catch (error) {
                console.error('Failed to send SMS:', error);
            }
        }
    };

    const handleConfirm = async (donationId) => {
        if (!window.confirm('Have you received all the medicines? This action cannot be undone.')) {
            return;
        }

        setConfirmingId(donationId);
        try {
            // Find the donation being confirmed
            const donation = pendingDonations.find(d => d._id === donationId);
            
            // Confirm receipt in backend
            const response = await api.put(`/donor/manager/confirm/${donationId}`, { 
                notes: managerNotes 
            });
            
            // Send email notification to donor
            const emailSent = await sendDonationDeliveredEmail(
                donation, 
                hospital?.name || 'the hospital', 
                managerNotes
            );
            
            // Send SMS notification if phone number exists
            await sendDonationDeliveredSMS(donation, hospital?.name);
            
            // Show success message with email status
            if (emailSent) {
                toast.success('Donation receipt confirmed! A confirmation email has been sent to the donor.', {
                    duration: 5000
                });
            } else {
                toast.success('Donation receipt confirmed! (Email notification failed, but donation is confirmed)', {
                    duration: 5000
                });
            }
            
            // Reset notes and refresh
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
            padding: '20px',
            maxWidth: '1200px',
            margin: '0 auto'
        },
        header: {
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            padding: '24px',
            borderRadius: '12px',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        },
        headerTitle: {
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '8px'
        },
        headerSubtitle: {
            fontSize: '14px',
            opacity: 0.9
        },
        statsBar: {
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap'
        },
        statCard: {
            backgroundColor: 'white',
            padding: '16px',
            borderRadius: '12px',
            flex: '1',
            minWidth: '150px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            textAlign: 'center'
        },
        statNumber: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#f59e0b'
        },
        statLabel: {
            fontSize: '13px',
            color: '#6b7280',
            marginTop: '4px'
        },
        donationCard: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s'
        },
        donorInfo: {
            backgroundColor: '#fef3c7',
            padding: '14px',
            borderRadius: '10px',
            marginBottom: '16px',
            borderLeft: '4px solid #f59e0b'
        },
        donorName: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#92400e',
            marginBottom: '6px'
        },
        donorContact: {
            fontSize: '13px',
            color: '#78350f'
        },
        itemsList: {
            marginTop: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            padding: '12px'
        },
        itemRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb'
        },
        totalRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px 0',
            marginTop: '8px',
            fontWeight: 'bold',
            borderTop: '2px solid #e5e7eb'
        },
        confirmButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            marginTop: '16px',
            width: '100%',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
        },
        confirmButtonDisabled: {
            backgroundColor: '#9ca3af',
            cursor: 'not-allowed'
        },
        notesInput: {
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            marginTop: '12px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical'
        },
        notesLabel: {
            fontSize: '13px',
            fontWeight: '500',
            color: '#374151',
            marginTop: '12px',
            marginBottom: '4px',
            display: 'block'
        },
        emptyState: {
            textAlign: 'center',
            padding: '60px',
            backgroundColor: 'white',
            borderRadius: '12px',
            color: '#6b7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        deliveryInfo: {
            backgroundColor: '#e0f2fe',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '12px',
            fontSize: '13px',
            borderLeft: '4px solid #0ea5e9'
        },
        donorNotes: {
            backgroundColor: '#fef3c7',
            padding: '12px',
            borderRadius: '8px',
            marginTop: '12px',
            fontSize: '13px',
            borderLeft: '4px solid #f59e0b'
        },
        loadingSpinner: {
            textAlign: 'center',
            padding: '60px',
            color: '#6b7280'
        }
    };

    if (loading) {
        return (
            <div style={styles.loadingSpinner}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <p>Loading pending deliveries...</p>
            </div>
        );
    }

    // Calculate total statistics
    const totalItems = pendingDonations.reduce((sum, d) => sum + d.totalItems, 0);
    const totalUnits = pendingDonations.reduce((sum, d) => sum + d.totalQuantity, 0);

    return (
        <div style={styles.container}>
            {hospital && (
                <div style={styles.header}>
                    <div style={styles.headerTitle}>🏥 {hospital.name}</div>
                    <div style={styles.headerSubtitle}>
                        📍 {hospital.district} District | Pending Deliveries Management
                    </div>
                </div>
            )}

            {/* Statistics Summary */}
            <div style={styles.statsBar}>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{pendingDonations.length}</div>
                    <div style={styles.statLabel}>Pending Deliveries</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{totalItems}</div>
                    <div style={styles.statLabel}>Medicine Types</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statNumber}>{totalUnits}</div>
                    <div style={styles.statLabel}>Total Units</div>
                </div>
            </div>

            {pendingDonations.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                    <h3 style={{ marginBottom: '8px' }}>No Pending Deliveries</h3>
                    <p>You don't have any donations waiting for confirmation.</p>
                    <p style={{ fontSize: '13px', marginTop: '8px' }}>Completed deliveries will appear here.</p>
                </div>
            ) : (
                pendingDonations.map(donation => (
                    <div key={donation._id} style={styles.donationCard}>
                        <div style={styles.donorInfo}>
                            <div style={styles.donorName}>👤 {donation.donorName}</div>
                            <div style={styles.donorContact}>
                                📧 {donation.donorEmail}
                                {donation.donorPhone && <span style={{ marginLeft: '12px' }}>📞 {donation.donorPhone}</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                                Donation ID: {donation.donationId} | Date: {new Date(donation.createdAt).toLocaleDateString()}
                            </div>
                        </div>

                        <div>
                            <strong>📦 Items to Receive:</strong>
                            <div style={styles.itemsList}>
                                {donation.items.map((item, idx) => (
                                    <div key={idx} style={styles.itemRow}>
                                        <span>
                                            {item.medicineName} 
                                            {item.weight && <span style={{ fontSize: '12px', color: '#6b7280' }}> ({item.weight}{item.unit})</span>}
                                        </span>
                                        <span style={{ fontWeight: '500' }}>{item.quantity} units</span>
                                    </div>
                                ))}
                                <div style={styles.totalRow}>
                                    <span>Total</span>
                                    <span>{donation.totalItems} items ({donation.totalQuantity} units)</span>
                                </div>
                            </div>
                        </div>

                        {donation.deliveryLocation && (
                            <div style={styles.deliveryInfo}>
                                <strong>📍 Delivery Location:</strong> {donation.deliveryLocation}
                                {donation.deliveryDate && (
                                    <div style={{ marginTop: '4px' }}>
                                        <strong>📅 Expected Date:</strong> {new Date(donation.deliveryDate).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        )}

                        {donation.notes && (
                            <div style={styles.donorNotes}>
                                <strong>📝 Donor Notes:</strong> {donation.notes}
                            </div>
                        )}

                        <label style={styles.notesLabel}>📋 Hospital Notes (Optional):</label>
                        <textarea
                            placeholder="Add any notes about the delivery (e.g., medicine condition, delivery issues, special instructions)..."
                            value={managerNotes}
                            onChange={(e) => setManagerNotes(e.target.value)}
                            style={styles.notesInput}
                            rows="3"
                        />

                        <button
                            onClick={() => handleConfirm(donation._id)}
                            disabled={confirmingId === donation._id}
                            style={{
                                ...styles.confirmButton,
                                ...(confirmingId === donation._id ? styles.confirmButtonDisabled : {})
                            }}
                        >
                            {confirmingId === donation._id ? (
                                <>⏳ Confirming...</>
                            ) : (
                                <>✅ Confirm Receipt & Notify Donor</>
                            )}
                        </button>
                        
                        <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginTop: '8px' }}>
                            The donor will receive an email confirmation after you confirm receipt.
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default PendingDeliveries;
