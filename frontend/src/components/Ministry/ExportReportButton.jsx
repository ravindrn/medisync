import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ExportReportButton = ({ onReportGenerated }) => {
    const [exporting, setExporting] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    const generateReport = async (type) => {
        setExporting(true);
        try {
            const response = await api.post('/ministry/generate-report', { 
                type,
                filters: {}
            }, {
                responseType: 'blob'
            });
            
            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Get filename from Content-Disposition header or create one
            const contentDisposition = response.headers['content-disposition'];
            let filename = `ministry_${type}_report_${Date.now()}.csv`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/);
                if (match) filename = match[1];
            }
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated and saved to history`);
            
            // Notify parent to refresh report history
            if (onReportGenerated) {
                onReportGenerated();
            }
        } catch (error) {
            console.error('Generate report error:', error);
            toast.error(error.response?.data?.message || 'Failed to generate report');
        } finally {
            setExporting(false);
            setShowDropdown(false);
        }
    };

    const reportTypes = [
        { id: 'stock', label: '📊 Stock Report', description: 'Complete stock inventory across all hospitals' },
        { id: 'shortages', label: '⚠️ Shortages Report', description: 'List of medicines with low/critical stock' },
        { id: 'excess', label: '📦 Excess Stock Report', description: 'Hospitals with excess stock for redistribution' }
    ];

    const styles = {
        dropdownContainer: {
            position: 'relative',
            display: 'inline-block'
        },
        exportButton: {
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        dropdownMenu: {
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            minWidth: '280px',
            zIndex: 1000,
            overflow: 'hidden'
        },
        dropdownItem: {
            padding: '12px 16px',
            cursor: 'pointer',
            borderBottom: '1px solid #e5e7eb',
            transition: 'background-color 0.2s'
        },
        itemTitle: {
            fontWeight: '600',
            marginBottom: '4px'
        },
        itemDescription: {
            fontSize: '12px',
            color: '#6b7280'
        },
        exportingText: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        spinner: {
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255,255,255,0.3)',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
        }
    };

    return (
        <div style={styles.dropdownContainer}>
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                disabled={exporting}
                style={styles.exportButton}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
            >
                {exporting ? (
                    <span style={styles.exportingText}>
                        <span style={styles.spinner}></span>
                        Generating...
                    </span>
                ) : (
                    <>
                        📥 Export Report
                        <span style={{ fontSize: '12px' }}>▼</span>
                    </>
                )}
            </button>

            {showDropdown && !exporting && (
                <div style={styles.dropdownMenu}>
                    {reportTypes.map(type => (
                        <div
                            key={type.id}
                            style={styles.dropdownItem}
                            onClick={() => generateReport(type.id)}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                        >
                            <div style={styles.itemTitle}>{type.label}</div>
                            <div style={styles.itemDescription}>{type.description}</div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ExportReportButton;