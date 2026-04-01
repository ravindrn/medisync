import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const MedicineManagement = () => {
    const [medicines, setMedicines] = useState([]);
    const [filteredMedicines, setFilteredMedicines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [districts, setDistricts] = useState([]);
    const [medicineNames, setMedicineNames] = useState([]);
    const [activeTab, setActiveTab] = useState('inventory');
    const [stockRequests, setStockRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchMedicines();
        fetchDistricts();
        fetchStockRequests();
    }, []);

    useEffect(() => {
        filterMedicines();
    }, [searchTerm, selectedDistrict, selectedMedicine, medicines]);

    const fetchMedicines = async () => {
        try {
            const response = await api.get('/admin/medicines');
            setMedicines(response.data);
            setFilteredMedicines(response.data);

            const names = [...new Set(response.data.map((m) => m.medicineName))];
            setMedicineNames(names.sort());
        } catch (error) {
            console.error('Failed to fetch medicines:', error);
            toast.error('Failed to load medicines');
        } finally {
            setLoading(false);
        }
    };

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            setDistricts(response.data);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
        }
    };

    const fetchStockRequests = async () => {
        setRequestsLoading(true);
        try {
            const response = await api.get('/transfers/stock-requests/pending?status=pending');
            setStockRequests(response.data.requests || []);
        } catch (error) {
            console.error('Failed to fetch stock requests:', error);
            setStockRequests([]);
        } finally {
            setRequestsLoading(false);
        }
    };

    const filterMedicines = () => {
        let filtered = [...medicines];

        if (searchTerm) {
            filtered = filtered.filter((m) =>
                m.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedMedicine) {
            filtered = filtered.filter((m) => m.medicineName === selectedMedicine);
        }

        if (selectedDistrict) {
            filtered = filtered
                .map((medicine) => ({
                    ...medicine,
                    stocks: medicine.stocks.filter((stock) => stock.district === selectedDistrict)
                }))
                .filter((medicine) => medicine.stocks.length > 0);
        }

        setFilteredMedicines(filtered);
    };

    const handleApproveRequest = async () => {
        try {
            await api.put(`/transfers/stock-requests/${selectedRequest._id}/approve`, {
                adminNotes
            });

            toast.success('Stock request approved! Stock has been updated.');
            setShowApproveModal(false);
            setSelectedRequest(null);
            setAdminNotes('');
            fetchStockRequests();
            fetchMedicines();
        } catch (error) {
            console.error('Failed to approve request:', error);
            toast.error(error.response?.data?.message || 'Failed to approve request');
        }
    };

    const handleRejectRequest = async () => {
        try {
            await api.put(`/transfers/stock-requests/${selectedRequest._id}/reject`, {
                rejectionReason
            });

            toast.success('Stock request rejected.');
            setShowRejectModal(false);
            setSelectedRequest(null);
            setRejectionReason('');
            fetchStockRequests();
        } catch (error) {
            console.error('Failed to reject request:', error);
            toast.error(error.response?.data?.message || 'Failed to reject request');
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedDistrict('');
        setSelectedMedicine('');
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: '#fef3c7', color: '#d97706', text: 'Pending', icon: '⏳' },
            approved: { bg: '#d1fae5', color: '#10b981', text: 'Approved', icon: '✅' },
            rejected: { bg: '#fee2e2', color: '#dc2626', text: 'Rejected', icon: '❌' }
        };
        return badges[status] || badges.pending;
    };

    const modalStyles = {
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
            maxWidth: '500px',
            width: '90%',
            padding: '0',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        header: {
            padding: '20px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        title: {
            fontSize: '20px',
            fontWeight: 'bold',
            margin: 0
        },
        content: {
            padding: '24px'
        },
        detailsCard: {
            backgroundColor: '#f9fafb',
            borderLeft: '4px solid #3b82f6',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px'
        },
        detailRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            gap: '10px'
        },
        detailLabel: {
            fontWeight: '600',
            color: '#374151'
        },
        detailValue: {
            color: '#6b7280',
            textAlign: 'right'
        },
        formGroup: {
            marginBottom: '16px'
        },
        label: {
            display: 'block',
            marginBottom: '6px',
            fontWeight: '500',
            fontSize: '14px'
        },
        textarea: {
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            minHeight: '80px',
            fontFamily: 'inherit',
            resize: 'vertical'
        },
        buttons: {
            display: 'flex',
            gap: '12px',
            marginTop: '20px'
        },
        approveButton: {
            flex: 1,
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
        },
        rejectButton: {
            flex: 1,
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
        },
        cancelButton: {
            flex: 1,
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
        }
    };

    const styles = {
        container: {
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '20px'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '15px'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        tabs: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        tab: {
            padding: '10px 20px',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontSize: '16px',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.3s'
        },
        activeTab: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        filterSection: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        filterTitle: {
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#374151'
        },
        filterGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '15px',
            marginBottom: '15px'
        },
        filterGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        },
        filterLabel: {
            fontSize: '13px',
            fontWeight: '500',
            color: '#6b7280'
        },
        filterInput: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px'
        },
        filterSelect: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        clearButton: {
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '20px'
        },
        tableContainer: {
            overflowX: 'auto',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        th: {
            padding: '15px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb',
            position: 'sticky',
            top: 0
        },
        td: {
            padding: '15px',
            borderBottom: '1px solid #e5e7eb',
            verticalAlign: 'top'
        },
        requestCard: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        stockBadge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        stats: {
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        statCard: {
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            flex: '1',
            minWidth: '150px'
        },
        statValue: {
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#3b82f6'
        },
        statLabel: {
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '5px'
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
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading medicines...</div>;
    }

    const totalStockEntries = filteredMedicines.reduce((sum, m) => sum + m.stocks.length, 0);
    const totalMedicines = filteredMedicines.length;
    const outOfStockCount = filteredMedicines.reduce(
        (sum, m) => sum + m.stocks.filter((s) => s.availableQuantity === 0).length,
        0
    );

    return (
        <div style={styles.container}>
            {showApproveModal && selectedRequest && (
                <div style={modalStyles.overlay} onClick={() => setShowApproveModal(false)}>
                    <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={modalStyles.header}>
                            <span style={{ fontSize: '24px' }}>✅</span>
                            <h3 style={modalStyles.title}>Approve Stock Request</h3>
                        </div>
                        <div style={modalStyles.content}>
                            <div style={modalStyles.detailsCard}>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Medicine:</span>
                                    <span style={modalStyles.detailValue}>
                                        {selectedRequest.medicineName} ({selectedRequest.weight}{selectedRequest.unit})
                                    </span>
                                </div>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Hospital:</span>
                                    <span style={modalStyles.detailValue}>{selectedRequest.hospitalName}</span>
                                </div>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Current Stock:</span>
                                    <span style={modalStyles.detailValue}>{selectedRequest.currentStock} units</span>
                                </div>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Requested Quantity:</span>
                                    <span style={{ ...modalStyles.detailValue, fontWeight: 'bold', color: '#10b981' }}>
                                        +{selectedRequest.requestedQuantity} units
                                    </span>
                                </div>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>New Stock After Update:</span>
                                    <span style={{ ...modalStyles.detailValue, fontWeight: 'bold', color: '#3b82f6' }}>
                                        {selectedRequest.newStockAfterUpdate} units
                                    </span>
                                </div>
                                {selectedRequest.reason && (
                                    <div style={modalStyles.detailRow}>
                                        <span style={modalStyles.detailLabel}>Reason:</span>
                                        <span style={modalStyles.detailValue}>{selectedRequest.reason}</span>
                                    </div>
                                )}
                            </div>

                            <div style={modalStyles.formGroup}>
                                <label style={modalStyles.label}>Admin Notes (Optional)</label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    style={modalStyles.textarea}
                                    placeholder="Add any notes about this approval..."
                                />
                            </div>

                            <div style={modalStyles.buttons}>
                                <button onClick={handleApproveRequest} style={modalStyles.approveButton}>
                                    Confirm Approval
                                </button>
                                <button onClick={() => setShowApproveModal(false)} style={modalStyles.cancelButton}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRejectModal && selectedRequest && (
                <div style={modalStyles.overlay} onClick={() => setShowRejectModal(false)}>
                    <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={modalStyles.header}>
                            <span style={{ fontSize: '24px' }}>❌</span>
                            <h3 style={modalStyles.title}>Reject Stock Request</h3>
                        </div>
                        <div style={modalStyles.content}>
                            <div style={modalStyles.detailsCard}>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Medicine:</span>
                                    <span style={modalStyles.detailValue}>
                                        {selectedRequest.medicineName} ({selectedRequest.weight}{selectedRequest.unit})
                                    </span>
                                </div>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Hospital:</span>
                                    <span style={modalStyles.detailValue}>{selectedRequest.hospitalName}</span>
                                </div>
                                <div style={modalStyles.detailRow}>
                                    <span style={modalStyles.detailLabel}>Requested Quantity:</span>
                                    <span style={modalStyles.detailValue}>{selectedRequest.requestedQuantity} units</span>
                                </div>
                            </div>

                            <div style={modalStyles.formGroup}>
                                <label style={modalStyles.label}>Rejection Reason *</label>
                                <textarea
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    style={modalStyles.textarea}
                                    placeholder="Please explain why this request is being rejected..."
                                    required
                                />
                            </div>

                            <div style={modalStyles.buttons}>
                                <button onClick={handleRejectRequest} style={modalStyles.rejectButton}>
                                    Confirm Rejection
                                </button>
                                <button onClick={() => setShowRejectModal(false)} style={modalStyles.cancelButton}>
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div style={styles.header}>
                <h1 style={styles.title}>Medicine Stock Management</h1>
            </div>

            <div style={styles.tabs}>
                <button
                    onClick={() => setActiveTab('inventory')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'inventory' ? styles.activeTab : {})
                    }}
                >
                    📦 Current Inventory
                </button>
                <button
                    onClick={() => {
                        setActiveTab('requests');
                        fetchStockRequests();
                    }}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'requests' ? styles.activeTab : {})
                    }}
                >
                    📋 Pending Stock Requests
                    {stockRequests.length > 0 && (
                        <span
                            style={{
                                backgroundColor: '#ef4444',
                                color: 'white',
                                borderRadius: '50%',
                                padding: '2px 6px',
                                fontSize: '10px',
                                marginLeft: '5px'
                            }}
                        >
                            {stockRequests.length}
                        </span>
                    )}
                </button>
            </div>

            {activeTab === 'inventory' && (
                <div style={styles.stats}>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{totalMedicines}</div>
                        <div style={styles.statLabel}>Medicine Types</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{totalStockEntries}</div>
                        <div style={styles.statLabel}>Stock Locations</div>
                    </div>
                    <div style={styles.statCard}>
                        <div style={styles.statValue}>{outOfStockCount}</div>
                        <div style={styles.statLabel}>Out of Stock</div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <>
                    <div style={styles.filterSection}>
                        <div style={styles.filterTitle}>🔍 Filter Stock Entries</div>
                        <div style={styles.filterGrid}>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Search by Medicine Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter medicine name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={styles.filterInput}
                                />
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Filter by Medicine</label>
                                <select
                                    value={selectedMedicine}
                                    onChange={(e) => setSelectedMedicine(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="">All Medicines</option>
                                    {medicineNames.map((name) => (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Filter by District</label>
                                <select
                                    value={selectedDistrict}
                                    onChange={(e) => setSelectedDistrict(e.target.value)}
                                    style={styles.filterSelect}
                                >
                                    <option value="">All Districts</option>
                                    {districts.map((district) => (
                                        <option key={district} value={district}>
                                            {district}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {(searchTerm || selectedDistrict || selectedMedicine) && (
                            <button onClick={clearFilters} style={styles.clearButton}>
                                Clear All Filters
                            </button>
                        )}
                    </div>

                    <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
                        Showing {filteredMedicines.reduce((sum, m) => sum + m.stocks.length, 0)} stock entries
                    </div>

                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Medicine</th>
                                    <th style={styles.th}>Strength</th>
                                    <th style={styles.th}>Hospital</th>
                                    <th style={styles.th}>District</th>
                                    <th style={styles.th}>Current Stock</th>
                                    <th style={styles.th}>Status</th>
                                    <th style={styles.th}>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMedicines.map((medicine) =>
                                    medicine.stocks.map((stock, idx) => {
                                        const isOutOfStock = stock.availableQuantity === 0;

                                        return (
                                            <tr key={`${medicine._id}-${idx}`}>
                                                <td style={styles.td}>
                                                    <strong>{medicine.medicineName}</strong>
                                                </td>
                                                <td style={styles.td}>
                                                    {medicine.weight}
                                                    {medicine.unit}
                                                </td>
                                                <td style={styles.td}>{stock.hospitalName}</td>
                                                <td style={styles.td}>{stock.district}</td>
                                                <td style={styles.td}>
                                                    <span
                                                        style={{
                                                            fontWeight: 'bold',
                                                            color: isOutOfStock ? '#dc2626' : '#10b981'
                                                        }}
                                                    >
                                                        {stock.availableQuantity} units
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    <span
                                                        style={{
                                                            ...styles.stockBadge,
                                                            backgroundColor: isOutOfStock
                                                                ? '#fee2e2'
                                                                : stock.availableQuantity < 50
                                                                ? '#fef3c7'
                                                                : '#d1fae5',
                                                            color: isOutOfStock
                                                                ? '#dc2626'
                                                                : stock.availableQuantity < 50
                                                                ? '#d97706'
                                                                : '#10b981'
                                                        }}
                                                    >
                                                        {isOutOfStock
                                                            ? 'Out of Stock'
                                                            : stock.availableQuantity < 50
                                                            ? 'Low Stock'
                                                            : 'In Stock'}
                                                    </span>
                                                </td>
                                                <td style={styles.td}>
                                                    {stock.lastUpdated
                                                        ? new Date(stock.lastUpdated).toLocaleDateString()
                                                        : 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredMedicines.reduce((sum, m) => sum + m.stocks.length, 0) === 0 && (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                            <p>No stock entries found matching your filters.</p>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'requests' && (
                <div>
                    {requestsLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Loading requests...</div>
                    ) : stockRequests.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                            <p>No pending stock requests</p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>
                                Hospital managers will submit requests when they need stock updates
                            </p>
                        </div>
                    ) : (
                        stockRequests.map((request) => {
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
                                        <span
                                            style={{
                                                backgroundColor: statusBadge.bg,
                                                color: statusBadge.color,
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '12px'
                                            }}
                                        >
                                            {statusBadge.icon} {statusBadge.text}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            backgroundColor: '#f9fafb',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div>
                                            <strong>🏥 Hospital:</strong> {request.hospitalName} ({request.hospitalDistrict})
                                        </div>
                                        <div>
                                            <strong>👤 Requested By:</strong> {request.requestedBy?.name} ({request.requestedBy?.email})
                                        </div>
                                    </div>

                                    <div>
                                        <strong>💊 Medicine:</strong> {request.medicineName} ({request.weight}
                                        {request.unit})
                                    </div>

                                    <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <span>
                                            <strong>Current Stock:</strong> {request.currentStock} units
                                        </span>
                                        <span style={{ color: '#10b981' }}>
                                            <strong>Requested:</strong> +{request.requestedQuantity} units
                                        </span>
                                        <span>
                                            <strong>New Stock:</strong> {request.newStockAfterUpdate} units
                                        </span>
                                    </div>

                                    {request.batchNumber && (
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                                            <strong>Batch Number:</strong> {request.batchNumber}
                                        </div>
                                    )}

                                    {request.expiryDate && (
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                                            <strong>Expiry Date:</strong> {new Date(request.expiryDate).toLocaleDateString()}
                                        </div>
                                    )}

                                    {request.reason && (
                                        <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                                            <strong>Reason:</strong> {request.reason}
                                        </div>
                                    )}

                                    {request.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowApproveModal(true);
                                                }}
                                                style={{
                                                    backgroundColor: '#10b981',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 20px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ✅ Approve Request
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowRejectModal(true);
                                                }}
                                                style={{
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                    padding: '8px 20px',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                ❌ Reject Request
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
};

export default MedicineManagement;