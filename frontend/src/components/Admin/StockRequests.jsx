import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const StockRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

    useEffect(() => {
        fetchRequests();
    }, [statusFilter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/transfers/stock-requests/pending?status=${statusFilter}`);
            setRequests(response.data.requests);
            setStats({
                pending: response.data.requests.filter(r => r.status === 'pending').length,
                approved: response.data.requests.filter(r => r.status === 'approved').length,
                rejected: response.data.requests.filter(r => r.status === 'rejected').length
            });
        } catch (error) {
            console.error('Failed to fetch stock requests:', error);
            toast.error('Failed to load stock requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            await api.put(`/transfers/stock-requests/${selectedRequest._id}/approve`, { adminNotes });
            toast.success('Stock request approved! Stock has been updated.');
            setShowApproveModal(false);
            setSelectedRequest(null);
            setAdminNotes('');
            fetchRequests();
        } catch (error) {
            console.error('Failed to approve request:', error);
            toast.error(error.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleReject = async () => {
        try {
            await api.put(`/transfers/stock-requests/${selectedRequest._id}/reject`, { rejectionReason });
            toast.success('Stock request rejected.');
            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectionReason('');
            fetchRequests();
        } catch (error) {
            console.error('Failed to reject request:', error);
            toast.error(error.response?.data?.message || 'Failed to reject request');
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending', icon: '⏳' },
            approved: { bg: '#d1fae5', color: '#10b981', text: 'Approved', icon: '✅' },
            rejected: { bg: '#fee2e2', color: '#dc2626', text: 'Rejected', icon: '❌' }
        };
        return badges[status];
    };

    const styles = {
        container: { padding: '20px' },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' },
        statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer' },
        statValue: { fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' },
        statLabel: { fontSize: '14px', color: '#6b7280' },
        filters: { display: 'flex', gap: '10px', marginBottom: '20px' },
        filterButton: { padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', border: 'none' },
        requestCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modal: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '90%' },
        modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' },
        formGroup: { marginBottom: '16px' },
        label: { display: 'block', marginBottom: '6px', fontWeight: '500' },
        input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px' },
        textarea: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', minHeight: '80px' },
        modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
        submitButton: { flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
        cancelButton: { flex: 1, backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
        emptyState: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#6b7280' }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading stock requests...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.statsGrid}>
                <div onClick={() => setStatusFilter('pending')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#d97706' }}>{stats.pending}</div>
                    <div style={styles.statLabel}>Pending</div>
                </div>
                <div onClick={() => setStatusFilter('approved')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.approved}</div>
                    <div style={styles.statLabel}>Approved</div>
                </div>
                <div onClick={() => setStatusFilter('rejected')} style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#dc2626' }}>{stats.rejected}</div>
                    <div style={styles.statLabel}>Rejected</div>
                </div>
            </div>

            <div style={styles.filters}>
                <button onClick={() => setStatusFilter('pending')} style={{ ...styles.filterButton, backgroundColor: statusFilter === 'pending' ? '#f59e0b' : '#e5e7eb', color: statusFilter === 'pending' ? 'white' : '#374151' }}>⏳ Pending</button>
                <button onClick={() => setStatusFilter('approved')} style={{ ...styles.filterButton, backgroundColor: statusFilter === 'approved' ? '#10b981' : '#e5e7eb', color: statusFilter === 'approved' ? 'white' : '#374151' }}>✅ Approved</button>
                <button onClick={() => setStatusFilter('rejected')} style={{ ...styles.filterButton, backgroundColor: statusFilter === 'rejected' ? '#ef4444' : '#e5e7eb', color: statusFilter === 'rejected' ? 'white' : '#374151' }}>❌ Rejected</button>
                <button onClick={() => setStatusFilter('all')} style={{ ...styles.filterButton, backgroundColor: statusFilter === 'all' ? '#3b82f6' : '#e5e7eb', color: statusFilter === 'all' ? 'white' : '#374151' }}>📋 All</button>
            </div>

            {requests.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                    <p>No stock requests found</p>
                </div>
            ) : (
                requests.map(request => {
                    const statusBadge = getStatusBadge(request.status);
                    return (
                        <div key={request._id} style={styles.requestCard}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div>
                                    <strong>Request ID:</strong> {request.requestId}
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        {new Date(request.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <span style={{ backgroundColor: statusBadge.bg, color: statusBadge.color, padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                                    {statusBadge.icon} {statusBadge.text}
                                </span>
                            </div>

                            <div style={{ backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                                <div><strong>🏥 Hospital:</strong> {request.hospitalName} ({request.hospitalDistrict})</div>
                                <div><strong>👤 Requested By:</strong> {request.requestedBy?.name} ({request.requestedBy?.email})</div>
                            </div>

                            <div><strong>💊 Medicine:</strong> {request.medicineName} ({request.weight}{request.unit})</div>
                            <div style={{ display: 'flex', gap: '20px', marginTop: '8px' }}>
                                <span><strong>Current Stock:</strong> {request.currentStock} units</span>
                                <span style={{ color: '#10b981' }}><strong>Requested:</strong> +{request.requestedQuantity} units</span>
                                <span><strong>New Stock:</strong> {request.newStockAfterUpdate} units</span>
                            </div>

                            {request.reason && (
                                <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                                    <strong>Reason:</strong> {request.reason}
                                </div>
                            )}

                            {request.adminNotes && (
                                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '6px', fontSize: '13px' }}>
                                    <strong>Admin Notes:</strong> {request.adminNotes}
                                </div>
                            )}

                            {request.rejectionReason && (
                                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '6px', fontSize: '13px', color: '#dc2626' }}>
                                    <strong>Rejection Reason:</strong> {request.rejectionReason}
                                </div>
                            )}

                            {request.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                    <button onClick={() => { setSelectedRequest(request); setShowApproveModal(true); }} style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer' }}>
                                        ✅ Approve
                                    </button>
                                    <button onClick={() => { setSelectedRequest(request); setShowRejectModal(true); }} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer' }}>
                                        ❌ Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* Approve Modal */}
            {showApproveModal && selectedRequest && (
                <div style={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Approve Stock Request</h3>
                        <p><strong>{selectedRequest.medicineName}</strong> - {selectedRequest.requestedQuantity} units</p>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Admin Notes (Optional)</label>
                            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} style={styles.textarea} placeholder="Add notes about this approval..." />
                        </div>
                        <div style={styles.modalButtons}>
                            <button onClick={handleApprove} style={styles.submitButton}>Confirm Approval</button>
                            <button onClick={() => setShowApproveModal(false)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedRequest && (
                <div style={styles.modalOverlay} onClick={() => setShowRejectModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Reject Stock Request</h3>
                        <p><strong>{selectedRequest.medicineName}</strong> - {selectedRequest.requestedQuantity} units</p>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Rejection Reason *</label>
                            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} style={styles.textarea} placeholder="Please explain why this request is being rejected..." required />
                        </div>
                        <div style={styles.modalButtons}>
                            <button onClick={handleReject} style={{ ...styles.submitButton, backgroundColor: '#ef4444' }}>Confirm Rejection</button>
                            <button onClick={() => setShowRejectModal(false)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockRequests;