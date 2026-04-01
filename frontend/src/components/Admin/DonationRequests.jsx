import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const DonationRequests = () => {
    const [donations, setDonations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDonation, setSelectedDonation] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [approveData, setApproveData] = useState({
        deliveryLocation: '',
        deliveryDate: '',
        adminNotes: ''
    });
    const [rejectReason, setRejectReason] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        delivered: 0,
        completed: 0,
        rejected: 0
    });

    useEffect(() => {
        fetchDonations();
    }, [statusFilter]);

    const fetchDonations = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/donor/admin/requests?status=${statusFilter}`);
            setDonations(response.data.donations);
            
            // Calculate stats from all donations
            const allResponse = await api.get('/donor/admin/requests?status=all');
            const allDonations = allResponse.data.donations;
            const statsCalc = {
                pending: allDonations.filter(d => d.status === 'pending').length,
                approved: allDonations.filter(d => d.status === 'approved').length,
                delivered: allDonations.filter(d => d.status === 'delivered').length,
                completed: allDonations.filter(d => d.status === 'completed').length,
                rejected: allDonations.filter(d => d.status === 'rejected').length
            };
            setStats(statsCalc);
        } catch (error) {
            console.error('Failed to fetch donations:', error);
            toast.error('Failed to load donation requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!approveData.deliveryLocation) {
            toast.error('Please enter delivery location');
            return;
        }
        
        try {
            await api.put(`/donor/admin/approve/${selectedDonation._id}`, approveData);
            toast.success('Donation approved successfully! Notifications sent to donor and hospital manager.');
            setShowApproveModal(false);
            setSelectedDonation(null);
            setApproveData({ deliveryLocation: '', deliveryDate: '', adminNotes: '' });
            fetchDonations();
        } catch (error) {
            console.error('Failed to approve donation:', error);
            toast.error(error.response?.data?.message || 'Failed to approve donation');
        }
    };

    const handleReject = async () => {
        if (!rejectReason) {
            toast.error('Please provide a reason for rejection');
            return;
        }
        
        try {
            await api.put(`/donor/admin/reject/${selectedDonation._id}`, { reason: rejectReason });
            toast.success('Donation rejected. Notification sent to donor.');
            setShowRejectModal(false);
            setSelectedDonation(null);
            setRejectReason('');
            fetchDonations();
        } catch (error) {
            console.error('Failed to reject donation:', error);
            toast.error(error.response?.data?.message || 'Failed to reject donation');
        }
    };

    const handleCompleteAfterDelivery = async () => {
        try {
            await api.put(`/donor/admin/complete-after-delivery/${selectedDonation._id}`);
            toast.success('Donation completed! Stock updated and certificate generated.');
            setShowCompleteModal(false);
            setSelectedDonation(null);
            fetchDonations();
        } catch (error) {
            console.error('Failed to complete donation:', error);
            toast.error(error.response?.data?.message || 'Failed to complete donation');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending Review', icon: '⏳' },
            approved: { bg: '#d1fae5', color: '#10b981', text: 'Approved - Awaiting Delivery', icon: '✅' },
            delivered: { bg: '#e0f2fe', color: '#0284c7', text: 'Delivered - Awaiting Confirmation', icon: '📦' },
            completed: { bg: '#d1fae5', color: '#10b981', text: 'Completed', icon: '🎉' },
            rejected: { bg: '#fee2e2', color: '#dc2626', text: 'Rejected', icon: '❌' },
            cancelled: { bg: '#f3f4f6', color: '#6b7280', text: 'Cancelled', icon: '🚫' }
        };
        const badge = badges[status] || badges.pending;
        return { ...badge, style: { backgroundColor: badge.bg, color: badge.color } };
    };

    const styles = {
        container: { padding: '20px' },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
            marginBottom: '24px'
        },
        statCard: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            transition: 'transform 0.2s',
            border: '1px solid #e5e7eb'
        },
        statValue: { fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' },
        statLabel: { fontSize: '14px', color: '#6b7280' },
        filters: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        filterButton: {
            padding: '8px 20px',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s'
        },
        activeFilter: { backgroundColor: '#3b82f6', color: 'white' },
        inactiveFilter: { backgroundColor: '#f3f4f6', color: '#6b7280' },
        donationCard: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        donationId: { fontSize: '14px', color: '#6b7280', fontWeight: '500' },
        donorInfo: {
            backgroundColor: '#f9fafb',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '12px'
        },
        itemsList: { marginTop: '12px', borderTop: '1px solid #e5e7eb', paddingTop: '12px' },
        itemRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb'
        },
        actionButtons: { display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' },
        approveButton: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
        rejectButton: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
        completeButton: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
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
        modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' },
        formGroup: { marginBottom: '16px' },
        label: { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: '#374151' },
        input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' },
        textarea: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', minHeight: '80px' },
        modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
        submitButton: { flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
        cancelButton: { flex: 1, backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' },
        emptyState: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#6b7280' }
    };

    if (loading && donations.length === 0) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading donation requests...</div>;
    }

    return (
        <div style={styles.container}>
            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div onClick={() => setStatusFilter('pending')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#d97706' }}>{stats.pending}</div>
                    <div style={styles.statLabel}>Pending</div>
                </div>
                <div onClick={() => setStatusFilter('approved')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.approved}</div>
                    <div style={styles.statLabel}>Approved</div>
                </div>
                <div onClick={() => setStatusFilter('delivered')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#0284c7' }}>{stats.delivered}</div>
                    <div style={styles.statLabel}>Delivered</div>
                </div>
                <div onClick={() => setStatusFilter('completed')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.completed}</div>
                    <div style={styles.statLabel}>Completed</div>
                </div>
                <div onClick={() => setStatusFilter('rejected')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#dc2626' }}>{stats.rejected}</div>
                    <div style={styles.statLabel}>Rejected</div>
                </div>
            </div>

            {/* Filters */}
            <div style={styles.filters}>
                <button onClick={() => setStatusFilter('pending')} style={{ ...styles.filterButton, ...(statusFilter === 'pending' ? styles.activeFilter : styles.inactiveFilter) }}>⏳ Pending</button>
                <button onClick={() => setStatusFilter('approved')} style={{ ...styles.filterButton, ...(statusFilter === 'approved' ? styles.activeFilter : styles.inactiveFilter) }}>✅ Approved</button>
                <button onClick={() => setStatusFilter('delivered')} style={{ ...styles.filterButton, ...(statusFilter === 'delivered' ? styles.activeFilter : styles.inactiveFilter) }}>📦 Delivered</button>
                <button onClick={() => setStatusFilter('completed')} style={{ ...styles.filterButton, ...(statusFilter === 'completed' ? styles.activeFilter : styles.inactiveFilter) }}>🎉 Completed</button>
                <button onClick={() => setStatusFilter('rejected')} style={{ ...styles.filterButton, ...(statusFilter === 'rejected' ? styles.activeFilter : styles.inactiveFilter) }}>❌ Rejected</button>
                <button onClick={() => setStatusFilter('all')} style={{ ...styles.filterButton, ...(statusFilter === 'all' ? styles.activeFilter : styles.inactiveFilter) }}>📋 All</button>
            </div>

            {/* Donations List */}
            {donations.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                    <p>No donation requests found</p>
                </div>
            ) : (
                donations.map(donation => {
                    const statusBadge = getStatusBadge(donation.status);
                    return (
                        <div key={donation._id} style={styles.donationCard}>
                            <div style={styles.cardHeader}>
                                <div>
                                    <div style={styles.donationId}>ID: {donation.donationId}</div>
                                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                                        {new Date(donation.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <span style={{ ...statusBadge.style, padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                                    {statusBadge.icon} {statusBadge.text}
                                </span>
                            </div>

                            <div style={styles.donorInfo}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <strong>Donor: {donation.donorName}</strong>
                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{donation.donorEmail}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280' }}>📞 {donation.donorPhone || 'No phone provided'}</div>
                            </div>

                            <div>
                                <strong>🏥 Hospital:</strong> {donation.hospitalName}
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>📍 {donation.hospitalDistrict}</div>
                            </div>

                            <div style={styles.itemsList}>
                                <strong>📦 Medicines:</strong>
                                {donation.items.slice(0, 5).map((item, idx) => (
                                    <div key={idx} style={styles.itemRow}>
                                        <span>{item.medicineName} ({item.weight}{item.unit})</span>
                                        <span>{item.quantity} units</span>
                                    </div>
                                ))}
                                {donation.items.length > 5 && (
                                    <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '8px' }}>
                                        +{donation.items.length - 5} more items
                                    </div>
                                )}
                                <div style={{ marginTop: '8px', fontSize: '13px', fontWeight: '500' }}>
                                    Total: {donation.totalItems} items ({donation.totalQuantity} units)
                                </div>
                            </div>

                            {donation.notes && (
                                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '13px' }}>
                                    📝 Donor Notes: {donation.notes}
                                </div>
                            )}

                            {donation.adminNotes && (
                                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '6px', fontSize: '13px' }}>
                                    📋 Admin Notes: {donation.adminNotes}
                                </div>
                            )}

                            {donation.managerNotes && (
                                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '13px' }}>
                                    🏥 Manager Notes: {donation.managerNotes}
                                </div>
                            )}

                            {donation.deliveryLocation && (
                                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#d1fae5', borderRadius: '6px', fontSize: '13px' }}>
                                    📍 Delivery Location: {donation.deliveryLocation}
                                    {donation.deliveryDate && (
                                        <div>📅 Delivery Date: {new Date(donation.deliveryDate).toLocaleDateString()}</div>
                                    )}
                                </div>
                            )}

                            {donation.rejectedReason && (
                                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                                    ❌ Rejection Reason: {donation.rejectedReason}
                                </div>
                            )}

                            <div style={styles.actionButtons}>
                                {donation.status === 'pending' && (
                                    <>
                                        <button onClick={() => { setSelectedDonation(donation); setShowApproveModal(true); }} style={styles.approveButton}>
                                            ✅ Approve Donation
                                        </button>
                                        <button onClick={() => { setSelectedDonation(donation); setShowRejectModal(true); }} style={styles.rejectButton}>
                                            ❌ Reject
                                        </button>
                                    </>
                                )}
                                {donation.status === 'delivered' && (
                                    <button onClick={() => { setSelectedDonation(donation); setShowCompleteModal(true); }} style={styles.completeButton}>
                                        🎉 Complete Donation (Stock Update)
                                    </button>
                                )}
                                {donation.status === 'completed' && (
                                    <button onClick={() => window.open(`/api/donor/certificate/${donation._id}/download`, '_blank')} style={styles.approveButton}>
                                        📄 Download Certificate
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedDonation && (
                <div style={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Approve Donation</h3>
                        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
                            Donor: <strong>{selectedDonation.donorName}</strong> | Hospital: <strong>{selectedDonation.hospitalName}</strong>
                        </p>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Delivery Location *</label>
                            <input type="text" value={approveData.deliveryLocation} onChange={(e) => setApproveData({ ...approveData, deliveryLocation: e.target.value })} style={styles.input} placeholder="Enter delivery address or location" required />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Delivery Date (Optional)</label>
                            <input type="date" value={approveData.deliveryDate} onChange={(e) => setApproveData({ ...approveData, deliveryDate: e.target.value })} style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Admin Notes (Optional)</label>
                            <textarea value={approveData.adminNotes} onChange={(e) => setApproveData({ ...approveData, adminNotes: e.target.value })} style={styles.textarea} placeholder="Any additional instructions..." />
                        </div>
                        <div style={styles.modalButtons}>
                            <button onClick={handleApprove} style={styles.submitButton}>Approve Donation</button>
                            <button onClick={() => setShowApproveModal(false)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedDonation && (
                <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Reject Donation</h3>
                        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>Donor: <strong>{selectedDonation.donorName}</strong></p>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Reason for Rejection *</label>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={styles.textarea} placeholder="Please explain why this donation is being rejected..." required />
                        </div>
                        <div style={styles.modalButtons}>
                            <button onClick={handleReject} style={{ ...styles.submitButton, backgroundColor: '#ef4444' }}>Reject Donation</button>
                            <button onClick={() => setShowRejectModal(false)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Modal (for delivered donations) */}
            {showCompleteModal && selectedDonation && (
                <div style={styles.modalOverlay} onClick={() => setShowCompleteModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Complete Donation</h3>
                        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
                            Confirm that the medicines have been received by <strong>{selectedDonation.hospitalName}</strong>.
                        </p>
                        <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                            <strong>⚠️ Action will:</strong>
                            <ul style={{ marginTop: '8px', marginLeft: '20px', fontSize: '13px' }}>
                                <li>Add stock to hospital inventory</li>
                                <li>Generate donation certificate</li>
                                <li>Send certificate email to donor</li>
                                <li>Notify hospital manager</li>
                            </ul>
                        </div>
                        <div style={styles.modalButtons}>
                            <button onClick={handleCompleteAfterDelivery} style={styles.submitButton}>Confirm & Complete</button>
                            <button onClick={() => setShowCompleteModal(false)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DonationRequests;
