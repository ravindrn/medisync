import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const WardStockSummary = () => {
    const [wardSummary, setWardSummary] = useState([]);
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWardSummary();
    }, []);

    const fetchWardSummary = async () => {
        setLoading(true);
        try {
            const response = await api.get('/transfers/ward-stock-summary');
            setHospital(response.data.hospital);
            setWardSummary(response.data.wards);
        } catch (error) {
            console.error('Failed to fetch ward summary:', error);
            toast.error('Failed to load ward summary');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: { padding: '20px' },
        header: {
            backgroundColor: '#f0f9ff',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px'
        },
        wardCard: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        },
        wardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap'
        },
        wardName: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b' },
        nurseInfo: { fontSize: '13px', color: '#6b7280' },
        statsRow: { display: 'flex', gap: '20px', marginBottom: '16px', flexWrap: 'wrap' },
        statBadge: {
            backgroundColor: '#f3f4f6',
            padding: '8px 16px',
            borderRadius: '8px',
            textAlign: 'center'
        },
        statNumber: { fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' },
        statLabel: { fontSize: '12px', color: '#6b7280' },
        medicineTag: {
            display: 'inline-block',
            backgroundColor: '#fef3c7',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            margin: '4px'
        },
        activityItem: {
            padding: '8px',
            borderBottom: '1px solid #e5e7eb',
            fontSize: '13px'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading ward summary...</div>;
    }

    const totalDispensed = wardSummary.reduce((sum, w) => sum + w.weeklyDispensed, 0);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>🏥 {hospital?.name}</h2>
                <p style={{ marginTop: '8px', color: '#6b7280' }}>
                    Weekly Ward Activity Summary (Last 7 days)
                </p>
                <div style={{ marginTop: '12px' }}>
                    <span style={{ fontWeight: 'bold' }}>Total Dispensed: </span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{totalDispensed}</span>
                    <span style={{ marginLeft: '8px' }}>units across {wardSummary.length} wards</span>
                </div>
            </div>

            {wardSummary.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                    No ward activity data available
                </div>
            ) : (
                wardSummary.map(ward => (
                    <div key={ward.wardName} style={styles.wardCard}>
                        <div style={styles.wardHeader}>
                            <div>
                                <div style={styles.wardName}>🏥 {ward.wardName}</div>
                                {ward.wardNumber && <div style={styles.nurseInfo}>Ward Number: {ward.wardNumber}</div>}
                            </div>
                            <div style={styles.nurseInfo}>
                                👩‍⚕️ Nurse: {ward.nurseName}
                                <br />
                                📧 {ward.nurseEmail}
                            </div>
                        </div>

                        <div style={styles.statsRow}>
                            <div style={styles.statBadge}>
                                <div style={styles.statNumber}>{ward.weeklyDispensed}</div>
                                <div style={styles.statLabel}>Units Dispensed (7 days)</div>
                            </div>
                            <div style={styles.statBadge}>
                                <div style={styles.statNumber}>{ward.topMedicines.length}</div>
                                <div style={styles.statLabel}>Top Medicines</div>
                            </div>
                            <div style={styles.statBadge}>
                                <div style={styles.statNumber}>{ward.recentActivities.length}</div>
                                <div style={styles.statLabel}>Recent Activities</div>
                            </div>
                        </div>

                        {ward.topMedicines.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <strong>Top Used Medicines:</strong>
                                <div style={{ marginTop: '8px' }}>
                                    {ward.topMedicines.map((med, idx) => (
                                        <span key={idx} style={styles.medicineTag}>
                                            {med._id}: {med.total} units
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {ward.recentActivities.length > 0 && (
                            <div>
                                <strong>Recent Activities:</strong>
                                <div style={{ marginTop: '8px' }}>
                                    {ward.recentActivities.slice(0, 3).map((activity, idx) => (
                                        <div key={idx} style={styles.activityItem}>
                                            💊 {activity.medicineName} - {activity.quantity} units
                                            {activity.patientName && ` (Patient: ${activity.patientName})`}
                                            <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '8px' }}>
                                                {new Date(activity.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default WardStockSummary;