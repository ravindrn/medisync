import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const PendingRequestsList = ({ hospitalId, onRefresh }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(null);

    useEffect(() => {
        fetchPendingRequests();
    }, []);

    const fetchPendingRequests = async () => {
        setLoading(true);
        try {
            const response = await api.get('/transfers/pending');
            setRequests(response.data);
        } catch (error) {
            console.error('Failed to fetch pending requests:', error);
            toast.error('Failed to load requests');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (requestId) => {
        setProcessingId(requestId);
        try {
            // For now, approve with full quantity
            const approvedQuantities = requests.find(r => r._id === requestId)?.medicines.map(m => m.requestedQuantity) || [];
            await api.put(`/transfers/${requestId}/approve`, { approvedQuantities });
            toast.success('Request approved successfully');
            fetchPendingRequests();
            onRefresh();
        } catch (error) {
            console.error('Approve error:', error);
            toast.error(error.response?.data?.message || 'Failed to approve request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (requestId) => {
        setProcessingId(requestId);
        try {
            await api.put(`/transfers/${requestId}/reject`, { reason: rejectReason });
            toast.success('Request rejected');
            setShowRejectModal(null);
            setRejectReason('');
            fetchPendingRequests();
            onRefresh();
        } catch (error) {
            console.error('Reject error:', error);
            toast.error(error.response?.data?.message || 'Failed to reject request');
        } finally {
            setProcessingId(null);
        }
    };

    const styles = {
        container: { padding: '10px' },
        requestCard: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            marginBottom: '15px',
            padding: '20px',
            border: '1px solid #e5e7eb'
        },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
        requestId: { fontSize: '14px', color: '#6b7280' },
        date: { fontSize: '12px', color: '#9ca3af' },
        hospitalInfo: { backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px', marginBottom: '15px' },
        hospitalName: { fontWeight: 'bold', fontSize: '16px' },
        hospitalDetail: { fontSize: '13px', color: '#6b7280', marginTop: '4px' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
        th: { padding: '8px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '13px', fontWeight: '600' },
        td: { padding: '8px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' },
        notes: { marginTop: '15px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' },
        buttonGroup: { display: 'flex', gap: '10px', marginTop: '15px' },
        approveButton: { padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
        rejectButton: { padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' },
        modalOverlay: {
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
            justifyContent: 'center', alignItems: 'center', zIndex: 1000
        },
        modal: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '400px', width: '90%' },
        modalTitle: { fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' },
        textarea: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', minHeight: '80px', marginBottom: '15px' },
        modalButtons: { display: 'flex', gap: '10px' },
        emptyState: { textAlign: 'center', padding: '40px', color: '#6b7280' }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading requests...</div>;

    if (requests.length === 0) {
        return <div style={styles.emptyState}>No pending requests</div>;
    }

    return (
        <div style={styles.container}>
            <h3 style={{ marginBottom: '20px' }}>📋 Incoming Transfer Requests</h3>
            {requests.map(request => (
                <div key={request._id} style={styles.requestCard}>
                    <div style={styles.header}>
                        <span style={styles.requestId}>Request ID: {request.requestId}</span>
                        <span style={styles.date}>{new Date(request.createdAt).toLocaleString()}</span>
                    </div>
                    
                    <div style={styles.hospitalInfo}>
                        <div style={styles.hospitalName}>🏥 {request.fromHospital.name}</div>
                        <div style={styles.hospitalDetail}>📍 {request.fromHospital.district}</div>
                    </div>
                    
                    <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Requested Medicines:</h4>
                    <table style={styles.table}>
                        <thead><tr><th style={styles.th}>Medicine</th><th style={styles.th}>Strength</th><th style={styles.th}>Quantity</th></tr></thead>
                        <tbody>
                            {request.medicines.map((med, idx) => (
                                <tr key={idx}><td style={styles.td}>{med.medicineName}</td><td style={styles.td}>{med.weight}{med.unit}</td><td style={styles.td}>{med.requestedQuantity} units</td></tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {request.notes && <div style={styles.notes}>📝 Notes: {request.notes}</div>}
                    
                    <div style={styles.buttonGroup}>
                        <button onClick={() => handleApprove(request._id)} disabled={processingId === request._id} style={styles.approveButton}>✓ Approve</button>
                        <button onClick={() => setShowRejectModal(request)} style={styles.rejectButton}>✗ Reject</button>
                    </div>
                </div>
            ))}

            {showRejectModal && (
                <div style={styles.modalOverlay} onClick={() => setShowRejectModal(null)}>
                    <div style={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Reject Request</h3>
                        <textarea placeholder="Reason for rejection..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} style={styles.textarea} />
                        <div style={styles.modalButtons}>
                            <button onClick={() => handleReject(showRejectModal._id)} style={styles.rejectButton}>Confirm Reject</button>
                            <button onClick={() => setShowRejectModal(null)} style={{ ...styles.rejectButton, backgroundColor: '#6b7280' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingRequestsList;