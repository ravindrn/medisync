import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ReportsHistory = ({ refreshTrigger, onRefresh }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReports, setSelectedReports] = useState([]);
    const [filter, setFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalReports, setTotalReports] = useState(0);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchReports();
    }, [page, filter, refreshTrigger]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/ministry/reports?page=${page}&limit=${itemsPerPage}&type=${filter}`);
            setReports(response.data.reports);
            setTotalPages(response.data.pages);
            setTotalReports(response.data.total);
        } catch (error) {
            console.error('Failed to fetch reports:', error);
            toast.error('Failed to load reports history');
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (reportId) => {
        try {
            const response = await api.get(`/ministry/reports/${reportId}/download`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            const contentDisposition = response.headers['content-disposition'];
            let filename = `report_${reportId}.csv`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match) filename = match[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Report downloaded successfully');
            fetchReports(); // Refresh to update download count
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download report');
        }
    };

    const handleDelete = async (reportId) => {
        if (window.confirm('Are you sure you want to delete this report?')) {
            try {
                await api.delete(`/ministry/reports/${reportId}`);
                toast.success('Report deleted successfully');
                fetchReports();
                if (onRefresh) onRefresh();
            } catch (error) {
                console.error('Delete error:', error);
                toast.error('Failed to delete report');
            }
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedReports.length === 0) {
            toast.error('No reports selected');
            return;
        }
        
        if (window.confirm(`Are you sure you want to delete ${selectedReports.length} selected report(s)?`)) {
            try {
                await api.delete('/ministry/reports', { data: { reportIds: selectedReports } });
                toast.success(`${selectedReports.length} report(s) deleted successfully`);
                setSelectedReports([]);
                fetchReports();
                if (onRefresh) onRefresh();
            } catch (error) {
                console.error('Delete multiple error:', error);
                toast.error('Failed to delete reports');
            }
        }
    };

    const toggleSelect = (reportId) => {
        setSelectedReports(prev => 
            prev.includes(reportId) 
                ? prev.filter(id => id !== reportId)
                : [...prev, reportId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedReports.length === reports.length && reports.length > 0) {
            setSelectedReports([]);
        } else {
            setSelectedReports(reports.map(r => r._id));
        }
    };

    const getTypeBadge = (type) => {
        const badges = {
            stock: { bg: '#d1fae5', color: '#10b981', icon: '📊', text: 'Stock Report' },
            shortages: { bg: '#fee2e2', color: '#dc2626', icon: '⚠️', text: 'Shortages Report' },
            excess: { bg: '#fef3c7', color: '#d97706', icon: '📦', text: 'Excess Report' }
        };
        const badge = badges[type] || badges.stock;
        return { ...badge, style: { backgroundColor: badge.bg, color: badge.color } };
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const styles = {
        container: { padding: '10px' },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '15px'
        },
        title: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        filterButtons: {
            display: 'flex',
            gap: '10px'
        },
        filterButton: {
            padding: '6px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '13px'
        },
        activeFilter: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderColor: '#3b82f6'
        },
        deleteSelectedButton: {
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '10px'
        },
        th: {
            padding: '12px',
            textAlign: 'left',
            backgroundColor: '#f8fafc',
            fontWeight: '600',
            borderBottom: '2px solid #e5e7eb'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #e5e7eb'
        },
        checkbox: {
            width: '20px',
            height: '20px',
            cursor: 'pointer'
        },
        badge: {
            display: 'inline-block',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        downloadButton: {
            padding: '4px 8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            marginRight: '8px'
        },
        deleteButton: {
            padding: '4px 8px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
        },
        pagination: {
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '20px'
        },
        pageButton: {
            padding: '6px 12px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: 'white',
            cursor: 'pointer'
        },
        activePage: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderColor: '#3b82f6'
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280'
        },
        statsRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            fontSize: '13px',
            color: '#6b7280'
        }
    };

    if (loading && page === 1) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading reports...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>📋 Reports History</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={styles.filterButtons}>
                        <button
                            onClick={() => setFilter('all')}
                            style={{ ...styles.filterButton, ...(filter === 'all' ? styles.activeFilter : {}) }}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('stock')}
                            style={{ ...styles.filterButton, ...(filter === 'stock' ? styles.activeFilter : {}) }}
                        >
                            Stock
                        </button>
                        <button
                            onClick={() => setFilter('shortages')}
                            style={{ ...styles.filterButton, ...(filter === 'shortages' ? styles.activeFilter : {}) }}
                        >
                            Shortages
                        </button>
                        <button
                            onClick={() => setFilter('excess')}
                            style={{ ...styles.filterButton, ...(filter === 'excess' ? styles.activeFilter : {}) }}
                        >
                            Excess
                        </button>
                    </div>
                    {selectedReports.length > 0 && (
                        <button onClick={handleDeleteSelected} style={styles.deleteSelectedButton}>
                            🗑️ Delete Selected ({selectedReports.length})
                        </button>
                    )}
                </div>
            </div>

            <div style={styles.statsRow}>
                <span>Total Reports: {totalReports}</span>
                <span>Page {page} of {totalPages}</span>
            </div>

            {reports.length === 0 ? (
                <div style={styles.emptyState}>
                    No reports generated yet. Generate your first report from the Export button.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>
                                    <input
                                        type="checkbox"
                                        checked={selectedReports.length === reports.length && reports.length > 0}
                                        onChange={toggleSelectAll}
                                        style={styles.checkbox}
                                    />
                                </th>
                                <th style={styles.th}>Report ID</th>
                                <th style={styles.th}>Type</th>
                                <th style={styles.th}>Title</th>
                                <th style={styles.th}>Records</th>
                                <th style={styles.th}>Size</th>
                                <th style={styles.th}>Downloads</th>
                                <th style={styles.th}>Generated</th>
                                <th style={styles.th}>Expires</th>
                                <th style={styles.th}>Actions</th>
                             </tr>
                             </thead>
                        <tbody>
                            {reports.map(report => {
                                const typeBadge = getTypeBadge(report.type);
                                return (
                                    <tr key={report._id}>
                                        <td style={styles.td}>
                                            <input
                                                type="checkbox"
                                                checked={selectedReports.includes(report._id)}
                                                onChange={() => toggleSelect(report._id)}
                                                style={styles.checkbox}
                                            />
                                         </td>
                                        <td style={styles.td}>
                                            <code style={{ fontSize: '11px' }}>{report.reportId}</code>
                                         </td>
                                        <td style={styles.td}>
                                            <span style={{ ...styles.badge, ...typeBadge.style }}>
                                                {typeBadge.icon} {typeBadge.text}
                                            </span>
                                         </td>
                                        <td style={styles.td}>
                                            <strong>{report.title}</strong>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                {report.description}
                                            </div>
                                         </td>
                                        <td style={styles.td}>{report.recordCount?.toLocaleString() || 0}</td>
                                        <td style={styles.td}>{formatFileSize(report.fileSize)}</td>
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: 'bold' }}>{report.downloadCount || 0}</span>
                                            {report.lastDownloaded && (
                                                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                                                    Last: {new Date(report.lastDownloaded).toLocaleDateString()}
                                                </div>
                                            )}
                                         </td>
                                        <td style={styles.td}>
                                            {formatDate(report.createdAt)}
                                         </td>
                                        <td style={styles.td}>
                                            <div style={{ fontSize: '11px', color: '#f59e0b' }}>
                                                {new Date(report.expiresAt).toLocaleDateString()}
                                            </div>
                                         </td>
                                        <td style={styles.td}>
                                            <button
                                                onClick={() => handleDownload(report._id)}
                                                style={styles.downloadButton}
                                                title="Download report"
                                            >
                                                📥
                                            </button>
                                            <button
                                                onClick={() => handleDelete(report._id)}
                                                style={styles.deleteButton}
                                                title="Delete report"
                                            >
                                                🗑️
                                            </button>
                                         </td>
                                     </tr>
                                );
                            })}
                        </tbody>
                     </table>
                </div>
            )}

            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        style={styles.pageButton}
                    >
                        Previous
                    </button>
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (page <= 3) {
                            pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = page - 2 + i;
                        }
                        return (
                            <button
                                key={pageNum}
                                onClick={() => setPage(pageNum)}
                                style={{ ...styles.pageButton, ...(page === pageNum ? styles.activePage : {}) }}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        style={styles.pageButton}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReportsHistory;