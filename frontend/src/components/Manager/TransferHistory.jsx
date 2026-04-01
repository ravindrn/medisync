import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const TransferHistory = ({ hospitalId, onRefresh }) => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get('/transfers/history');
            console.log('Transfer history:', response.data);
            setTransfers(response.data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmReceipt = async (transferId) => {
        try {
            await api.put(`/transfers/${transferId}/confirm`);
            toast.success('Transfer confirmed! Stock updated.');
            fetchHistory();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Confirm error:', error);
            toast.error(error.response?.data?.message || 'Failed to confirm receipt');
        }
    };

    const handleDownloadPDF = async (transferId) => {
        try {
            const response = await api.get(`/transfers/${transferId}/pdf`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `transfer_${transferId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Download PDF error:', error);
            toast.error('Failed to download PDF');
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending' },
            approved: { bg: '#d1fae5', color: '#10b981', text: 'Approved' },
            rejected: { bg: '#fee2e2', color: '#dc2626', text: 'Rejected' },
            completed: { bg: '#d1fae5', color: '#10b981', text: 'Completed' },
            cancelled: { bg: '#f3f4f6', color: '#6b7280', text: 'Cancelled' }
        };
        const s = styles[status] || styles.pending;
        return { backgroundColor: s.bg, color: s.color, text: s.text };
    };

    const getTransferTypeLabel = (transfer, hospitalId) => {
        const isRequester = transfer.fromHospital.id === hospitalId;
        const isSupplier = transfer.toHospital.id === hospitalId;
        
        if (isRequester && transfer.status === 'completed') {
            return { text: 'Received', icon: '📥', color: '#10b981', bg: '#d1fae5' };
        }
        if (isSupplier && transfer.status === 'completed') {
            return { text: 'Sent', icon: '📤', color: '#3b82f6', bg: '#dbeafe' };
        }
        if (isRequester && transfer.status === 'approved') {
            return { text: 'Awaiting Receipt', icon: '⏳', color: '#f59e0b', bg: '#fef3c7' };
        }
        if (isSupplier && transfer.status === 'approved') {
            return { text: 'Awaiting Confirmation', icon: '⏳', color: '#f59e0b', bg: '#fef3c7' };
        }
        if (isRequester && transfer.status === 'pending') {
            return { text: 'Request Pending', icon: '🕐', color: '#6b7280', bg: '#f3f4f6' };
        }
        if (isSupplier && transfer.status === 'pending') {
            return { text: 'Request Received', icon: '📋', color: '#f59e0b', bg: '#fef3c7' };
        }
        if (transfer.status === 'rejected') {
            return { text: 'Rejected', icon: '❌', color: '#dc2626', bg: '#fee2e2' };
        }
        return { text: transfer.status, icon: '📄', color: '#6b7280', bg: '#f3f4f6' };
    };

    const filteredTransfers = transfers.filter(t => {
        if (filter === 'sent') return t.toHospital.id === hospitalId;
        if (filter === 'received') return t.fromHospital.id === hospitalId;
        return true;
    });

    const styles = {
        container: { padding: '10px' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
        filterButtons: { display: 'flex', gap: '10px' },
        filterButton: { padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px' },
        activeFilter: { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' },
        transferCard: { backgroundColor: '#f9fafb', borderRadius: '12px', marginBottom: '15px', padding: '20px', border: '1px solid #e5e7eb' },
        headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' },
        requestId: { fontSize: '14px', color: '#6b7280' },
        date: { fontSize: '12px', color: '#9ca3af' },
        badge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
        typeBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
        hospitalInfo: { display: 'flex', gap: '20px', marginBottom: '15px', flexWrap: 'wrap' },
        hospitalBox: { flex: 1, backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '8px' },
        hospitalLabel: { fontSize: '11px', color: '#6b7280', marginBottom: '5px' },
        hospitalName: { fontWeight: 'bold', fontSize: '14px' },
        arrowIcon: { fontSize: '20px', textAlign: 'center', paddingTop: '20px' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
        th: { padding: '8px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '13px', fontWeight: '600' },
        td: { padding: '8px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' },
        confirmButton: { marginTop: '15px', padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' },
        downloadButton: { marginTop: '15px', marginLeft: '10px', padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '5px' },
        buttonGroup: { display: 'flex', gap: '10px', marginTop: '15px' },
        emptyState: { textAlign: 'center', padding: '40px', color: '#6b7280' }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading history...</div>;

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h3 style={{ margin: 0 }}>Transfer History</h3>
                <div style={styles.filterButtons}>
                    <button onClick={() => setFilter('all')} style={{ ...styles.filterButton, ...(filter === 'all' ? styles.activeFilter : {}) }}>All</button>
                    <button onClick={() => setFilter('sent')} style={{ ...styles.filterButton, ...(filter === 'sent' ? styles.activeFilter : {}) }}>Sent (You gave)</button>
                    <button onClick={() => setFilter('received')} style={{ ...styles.filterButton, ...(filter === 'received' ? styles.activeFilter : {}) }}>Received (You got)</button>
                </div>
            </div>

            {filteredTransfers.length === 0 ? (
                <div style={styles.emptyState}>No transfer history found</div>
            ) : (
                filteredTransfers.map(transfer => {
                    const statusBadge = getStatusBadge(transfer.status);
                    const typeInfo = getTransferTypeLabel(transfer, hospitalId);
                    const needsConfirmation = transfer.status === 'approved' && transfer.fromHospital.id === hospitalId;
                    const canDownloadPDF = transfer.status === 'completed' || transfer.status === 'rejected';
                    
                    return (
                        <div key={transfer._id} style={styles.transferCard}>
                            <div style={styles.headerRow}>
                                <span style={styles.requestId}>ID: {transfer.requestId}</span>
                                <span style={styles.date}>{new Date(transfer.createdAt).toLocaleString()}</span>
                                <span style={{ ...styles.typeBadge, backgroundColor: typeInfo.bg, color: typeInfo.color }}>
                                    {typeInfo.icon} {typeInfo.text}
                                </span>
                            </div>
                            
                            <div style={styles.hospitalInfo}>
                                <div style={styles.hospitalBox}>
                                    <div style={styles.hospitalLabel}>From Hospital (Sending)</div>
                                    <div style={styles.hospitalName}>🏥 {transfer.toHospital.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>📍 {transfer.toHospital.district}</div>
                                </div>
                                <div style={styles.arrowIcon}>→</div>
                                <div style={styles.hospitalBox}>
                                    <div style={styles.hospitalLabel}>To Hospital (Receiving)</div>
                                    <div style={styles.hospitalName}>🏥 {transfer.fromHospital.name}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>📍 {transfer.fromHospital.district}</div>
                                </div>
                            </div>
                            
                            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Medicines:</h4>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Medicine</th>
                                        <th style={styles.th}>Strength</th>
                                        <th style={styles.th}>Requested</th>
                                        <th style={styles.th}>Approved</th>
                                    </tr>
                                     </thead>
                                <tbody>
                                    {transfer.medicines.map((med, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.td}>{med.medicineName}</td>
                                            <td style={styles.td}>{med.weight}{med.unit}</td>
                                            <td style={styles.td}>{med.requestedQuantity} units</td>
                                            <td style={styles.td}>{med.approvedQuantity || '-'} units</td>
                                         </tr>
                                    ))}
                                </tbody>
                             </table>
                            
                            {transfer.rejectionReason && (
                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '8px', fontSize: '13px', color: '#dc2626' }}>
                                    Rejection Reason: {transfer.rejectionReason}
                                </div>
                            )}
                            
                            {transfer.notes && (
                                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
                                    Notes: {transfer.notes}
                                </div>
                            )}
                            
                            <div style={styles.buttonGroup}>
                                {needsConfirmation && (
                                    <button onClick={() => handleConfirmReceipt(transfer._id)} style={styles.confirmButton}>
                                        ✓ Confirm Receipt & Update Stock
                                    </button>
                                )}
                                
                                {canDownloadPDF && (
                                    <button onClick={() => handleDownloadPDF(transfer._id)} style={styles.downloadButton}>
                                        📄 Download PDF
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default TransferHistory;