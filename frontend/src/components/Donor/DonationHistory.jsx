import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import DonationEditForm from './DonationEditForm';

const DonationHistory = ({ onUpdate }) => {
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDonation, setSelectedDonation] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingDonation, setEditingDonation] = useState(null);

    useEffect(() => {
        fetchDonations();
    }, []);

    const fetchDonations = async () => {
        setLoading(true);
        try {
            const response = await api.get('/donor/history');
            console.log('Donations fetched:', response.data);
            setDonations(response.data);
        } catch (error) {
            console.error('Failed to fetch donations:', error);
            toast.error('Failed to load donation history');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadCertificate = async (donationId) => {
        try {
            const response = await api.get(`/donor/certificate/${donationId}/download`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `donation_certificate_${donationId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Certificate downloaded successfully');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download certificate');
        }
    };

    const handleEdit = (donation) => {
        setEditingDonation(donation);
        setShowEditModal(true);
    };

    const handleCancel = async (donation) => {
        if (window.confirm('Are you sure you want to cancel this donation request? This action cannot be undone.')) {
            try {
                await api.delete(`/donor/donation/${donation._id}`);
                toast.success('Donation cancelled successfully');
                fetchDonations();
                if (onUpdate) onUpdate();
            } catch (error) {
                console.error('Failed to cancel donation:', error);
                toast.error(error.response?.data?.message || 'Failed to cancel donation');
            }
        }
    };

    const getStatusBadge = (status) => {
        const statusLower = status?.toLowerCase() || 'pending';
        const badges = {
            pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending Review', icon: '⏳' },
            approved: { bg: '#d1fae5', color: '#10b981', text: 'Approved', icon: '✅' },
            completed: { bg: '#d1fae5', color: '#10b981', text: 'Completed ✓', icon: '🎉' },
            rejected: { bg: '#fee2e2', color: '#dc2626', text: 'Rejected', icon: '❌' },
            cancelled: { bg: '#f3f4f6', color: '#6b7280', text: 'Cancelled', icon: '🚫' }
        };
        const badge = badges[statusLower] || badges.pending;
        return { ...badge, style: { backgroundColor: badge.bg, color: badge.color } };
    };

    const styles = {
        container: { padding: '10px' },
        donationCard: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid #e5e7eb'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap'
        },
        donationId: {
            fontSize: '14px',
            color: '#6b7280'
        },
        date: {
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '4px'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        hospitalInfo: {
            backgroundColor: '#f3f4f6',
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
        actionButton: {
            marginTop: '12px',
            padding: '8px 16px',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
        },
        certificateButton: {
            backgroundColor: '#3b82f6'
        },
        editButton: {
            backgroundColor: '#f59e0b'
        },
        cancelButton: {
            backgroundColor: '#ef4444'
        },
        actionButtons: {
            display: 'flex',
            gap: '10px',
            marginTop: '12px',
            flexWrap: 'wrap'
        },
        viewDetails: {
            marginTop: '12px',
            color: '#3b82f6',
            cursor: 'pointer',
            fontSize: '13px'
        },
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
        },
        modal: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
        },
        editHistoryBadge: {
            display: 'inline-block',
            padding: '2px 8px',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            borderRadius: '12px',
            fontSize: '11px',
            marginLeft: '8px'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading donation history...</div>;
    }

    if (donations.length === 0) {
        return (
            <div style={styles.emptyState}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎁</div>
                <p>You haven't made any donations yet.</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Click "Make a Donation Pledge" to start helping others!</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={{ marginBottom: '20px' }}>📋 My Donation History</h2>
            
            {donations.map(donation => {
                const statusBadge = getStatusBadge(donation.status);
                // Case-insensitive status check
                const isPending = donation.status?.toLowerCase() === 'pending';
                const isCompleted = donation.status?.toLowerCase() === 'completed';
                
                return (
                    <div key={donation._id} style={styles.donationCard}>
                        <div style={styles.header}>
                            <div>
                                <div style={styles.donationId}>
                                    ID: {donation.donationId}
                                    {donation.isEdited && (
                                        <span style={styles.editHistoryBadge}>
                                            ✏️ Edited
                                        </span>
                                    )}
                                </div>
                                <div style={styles.date}>
                                    {new Date(donation.createdAt).toLocaleDateString()}
                                    {donation.updatedAt !== donation.createdAt && isPending && (
                                        <span style={{ marginLeft: '8px', color: '#f59e0b' }}>
                                            (Updated: {new Date(donation.updatedAt).toLocaleDateString()})
                                        </span>
                                    )}
                                </div>
                            </div>
                            <span style={{ ...styles.badge, ...statusBadge.style }}>
                                {statusBadge.icon} {statusBadge.text}
                            </span>
                        </div>
                        
                        <div style={styles.hospitalInfo}>
                            <strong>🏥 Hospital:</strong> {donation.hospitalName}
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                📍 {donation.hospitalDistrict}
                            </div>
                        </div>
                        
                        <div>
                            <strong>📦 Items: {donation.totalItems} medicines ({donation.totalQuantity} units)</strong>
                            <div style={styles.itemsList}>
                                {donation.items.slice(0, 3).map((item, idx) => (
                                    <div key={idx} style={styles.itemRow}>
                                        <span>{item.medicineName} ({item.weight}{item.unit})</span>
                                        <span>{item.quantity} units</span>
                                    </div>
                                ))}
                                {donation.items.length > 3 && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                                        +{donation.items.length - 3} more items
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {donation.notes && (
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px' }}>
                                📝 Notes: {donation.notes}
                            </div>
                        )}
                        
                        {/* Edit and Cancel Buttons - Fixed with case-insensitive check */}
                        {isPending && (
                            <div style={styles.actionButtons}>
                                <button
                                    onClick={() => handleEdit(donation)}
                                    style={{ ...styles.actionButton, ...styles.editButton }}
                                >
                                    ✏️ Edit Donation
                                </button>
                                <button
                                    onClick={() => handleCancel(donation)}
                                    style={{ ...styles.actionButton, ...styles.cancelButton }}
                                >
                                    ❌ Cancel Request
                                </button>
                            </div>
                        )}
                        
                        {/* Certificate Button for Completed Donations */}
                        {isCompleted && (
                            <button
                                onClick={() => handleDownloadCertificate(donation._id)}
                                style={{ ...styles.actionButton, ...styles.certificateButton }}
                            >
                                📄 Download Certificate
                            </button>
                        )}
                        
                        {/* Show message for non-pending, non-completed donations */}
                        {!isPending && !isCompleted && (
                            <div style={{ 
                                marginTop: '12px', 
                                padding: '8px', 
                                backgroundColor: '#f3f4f6', 
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#6b7280',
                                textAlign: 'center'
                            }}>
                                ℹ️ This donation is {donation.status} and cannot be edited
                            </div>
                        )}
                        
                        {donation.rejectedReason && donation.status?.toLowerCase() === 'rejected' && (
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                                <strong>❌ Rejection Reason:</strong> {donation.rejectedReason}
                            </div>
                        )}
                        
                        {donation.adminNotes && donation.status?.toLowerCase() === 'approved' && (
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '13px', color: '#92400e' }}>
                                <strong>📋 Admin Note:</strong> {donation.adminNotes}
                            </div>
                        )}
                        
                        {donation.deliveryLocation && donation.status?.toLowerCase() === 'approved' && (
                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '6px', fontSize: '13px', color: '#0369a1' }}>
                                <strong>📍 Delivery Location:</strong> {donation.deliveryLocation}
                                {donation.deliveryDate && (
                                    <div><strong>📅 Delivery Date:</strong> {new Date(donation.deliveryDate).toLocaleDateString()}</div>
                                )}
                            </div>
                        )}
                        
                        <div
                            onClick={() => setSelectedDonation(donation)}
                            style={styles.viewDetails}
                        >
                            View Details →
                        </div>
                    </div>
                );
            })}
            
            {selectedDonation && (
                <DonationDetailsModal
                    donation={selectedDonation}
                    onClose={() => setSelectedDonation(null)}
                />
            )}
            
            {showEditModal && editingDonation && (
                <DonationEditForm
                    donation={editingDonation}
                    onClose={() => {
                        setShowEditModal(false);
                        setEditingDonation(null);
                    }}
                    onSuccess={() => {
                        setShowEditModal(false);
                        setEditingDonation(null);
                        fetchDonations();
                        if (onUpdate) onUpdate();
                    }}
                />
            )}
        </div>
    );
};

const DonationDetailsModal = ({ donation, onClose }) => {
    const styles = {
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
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
            maxHeight: '80vh',
            overflow: 'auto'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        editHistoryBadge: {
            fontSize: '12px',
            padding: '4px 8px',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            borderRadius: '12px'
        },
        section: {
            marginBottom: '20px'
        },
        label: {
            fontSize: '13px',
            color: '#6b7280',
            marginBottom: '4px'
        },
        value: {
            fontSize: '15px',
            fontWeight: '500',
            color: '#1f2937'
        },
        itemRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb'
        },
        closeButton: {
            marginTop: '20px',
            padding: '10px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%'
        },
        editHistorySection: {
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px'
        },
        editHistoryItem: {
            fontSize: '12px',
            padding: '8px',
            borderBottom: '1px solid #fde68a'
        }
    };

    return (
        <div style={styles.modalOverlay} onClick={onClose}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.title}>
                    <span>Donation Details</span>
                    {donation.isEdited && (
                        <span style={styles.editHistoryBadge}>✏️ Edited</span>
                    )}
                </div>
                
                <div style={styles.section}>
                    <div style={styles.label}>Donation ID</div>
                    <div style={styles.value}>{donation.donationId}</div>
                </div>
                
                <div style={styles.section}>
                    <div style={styles.label}>Date</div>
                    <div style={styles.value}>{new Date(donation.createdAt).toLocaleString()}</div>
                    {donation.updatedAt !== donation.createdAt && (
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                            Last updated: {new Date(donation.updatedAt).toLocaleString()}
                        </div>
                    )}
                </div>
                
                <div style={styles.section}>
                    <div style={styles.label}>Hospital</div>
                    <div style={styles.value}>{donation.hospitalName}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>📍 {donation.hospitalDistrict}</div>
                </div>
                
                <div style={styles.section}>
                    <div style={styles.label}>Status</div>
                    <div style={styles.value}>{donation.status?.toUpperCase()}</div>
                </div>
                
                <div style={styles.section}>
                    <div style={styles.label}>Medicines Donated</div>
                    {donation.items.map((item, idx) => (
                        <div key={idx} style={styles.itemRow}>
                            <span>{item.medicineName} ({item.weight}{item.unit})</span>
                            <span>{item.quantity} units</span>
                        </div>
                    ))}
                    <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: '500' }}>
                        Total: {donation.totalItems} items ({donation.totalQuantity} units)
                    </div>
                </div>
                
                {donation.notes && (
                    <div style={styles.section}>
                        <div style={styles.label}>Your Notes</div>
                        <div style={styles.value}>{donation.notes}</div>
                    </div>
                )}
                
                {donation.adminNotes && (
                    <div style={styles.section}>
                        <div style={styles.label}>Admin Notes</div>
                        <div style={styles.value}>{donation.adminNotes}</div>
                    </div>
                )}
                
                {donation.deliveryLocation && (
                    <div style={styles.section}>
                        <div style={styles.label}>Delivery Location</div>
                        <div style={styles.value}>{donation.deliveryLocation}</div>
                        {donation.deliveryDate && (
                            <div style={styles.value}>Date: {new Date(donation.deliveryDate).toLocaleDateString()}</div>
                        )}
                    </div>
                )}
                
                {donation.rejectedReason && (
                    <div style={styles.section}>
                        <div style={styles.label}>Rejection Reason</div>
                        <div style={{ ...styles.value, color: '#dc2626' }}>{donation.rejectedReason}</div>
                    </div>
                )}
                
                {donation.editHistory && donation.editHistory.length > 0 && (
                    <div style={styles.editHistorySection}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>📝 Edit History</div>
                        {donation.editHistory.map((edit, idx) => (
                            <div key={idx} style={styles.editHistoryItem}>
                                <div>Edited on: {new Date(edit.editedAt).toLocaleString()}</div>
                                <div>Previous items: {edit.previousTotalItems} medicines ({edit.previousTotalQuantity} units)</div>
                            </div>
                        ))}
                    </div>
                )}
                
                <button onClick={onClose} style={styles.closeButton}>Close</button>
            </div>
        </div>
    );
};

export default DonationHistory;
