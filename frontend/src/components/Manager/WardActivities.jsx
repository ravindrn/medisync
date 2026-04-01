import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const WardActivities = () => {
    const [activities, setActivities] = useState([]);
    const [wards, setWards] = useState([]);
    const [stats, setStats] = useState({
        totalDispenses: 0,
        totalQuantityDispensed: 0,
        topDispensedMedicines: [],
        activitiesByWard: []
    });
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        ward: 'all',
        activityType: 'all',
        startDate: '',
        endDate: ''
    });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchActivities();
    }, [filters, page]);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page,
                limit: 50,
                ...filters
            });
            const response = await api.get(`/transfers/ward-activities?${params}`);
            setActivities(response.data.activities);
            setWards(response.data.wards);
            setStats(response.data.stats);
            setTotalPages(response.data.pages);
        } catch (error) {
            console.error('Failed to fetch ward activities:', error);
            toast.error('Failed to load ward activities');
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type) => {
        const icons = {
            dispense: '💊',
            return: '🔄',
            transfer_in: '📥',
            transfer_out: '📤',
            stock_adjustment: '⚙️'
        };
        return icons[type] || '📋';
    };

    const getActivityColor = (type) => {
        const colors = {
            dispense: '#10b981',
            return: '#f59e0b',
            transfer_in: '#3b82f6',
            transfer_out: '#8b5cf6',
            stock_adjustment: '#6b7280'
        };
        return colors[type] || '#6b7280';
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    const styles = {
        container: { padding: '20px' },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '20px',
            marginBottom: '24px'
        },
        statCard: {
            backgroundColor: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center'
        },
        statValue: { fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '8px' },
        statLabel: { fontSize: '14px', color: '#6b7280' },
        filterRow: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '12px'
        },
        select: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        input: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px'
        },
        table: {
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            overflow: 'auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
        activityBadge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        },
        pagination: {
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '20px'
        },
        pageButton: {
            padding: '8px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: 'white'
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
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading ward activities...</div>;
    }

    return (
        <div style={styles.container}>
            {/* Stats Summary */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalDispenses}</div>
                    <div style={styles.statLabel}>Total Dispense Events</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalQuantityDispensed}</div>
                    <div style={styles.statLabel}>Total Units Dispensed</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{wards.length}</div>
                    <div style={styles.statLabel}>Active Wards</div>
                </div>
            </div>

            {/* Top Medicines Section */}
            {stats.topDispensedMedicines.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '12px' }}>Top Dispensed Medicines</h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {stats.topDispensedMedicines.map((med, idx) => (
                            <div key={idx} style={{ backgroundColor: '#f0fdf4', padding: '12px 20px', borderRadius: '8px' }}>
                                <strong>{med._id}</strong>
                                <span style={{ marginLeft: '8px', color: '#10b981' }}>{med.total} units</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div style={styles.filterRow}>
                <select
                    value={filters.ward}
                    onChange={(e) => setFilters({ ...filters, ward: e.target.value, page: 1 })}
                    style={styles.select}
                >
                    <option value="all">All Wards</option>
                    {wards.map(ward => (
                        <option key={ward} value={ward}>{ward}</option>
                    ))}
                </select>
                <select
                    value={filters.activityType}
                    onChange={(e) => setFilters({ ...filters, activityType: e.target.value, page: 1 })}
                    style={styles.select}
                >
                    <option value="all">All Activities</option>
                    <option value="dispense">Dispense</option>
                    <option value="return">Return</option>
                    <option value="transfer_in">Transfer In</option>
                    <option value="transfer_out">Transfer Out</option>
                </select>
                <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                    style={styles.input}
                    placeholder="Start Date"
                />
                <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                    style={styles.input}
                    placeholder="End Date"
                />
            </div>

            {/* Activities Table */}
            {activities.length === 0 ? (
                <div style={styles.emptyState}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <p>No ward activities found</p>
                </div>
            ) : (
                <>
                    <div style={styles.table}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Date</th>
                                    <th style={styles.th}>Ward</th>
                                    <th style={styles.th}>Activity</th>
                                    <th style={styles.th}>Medicine</th>
                                    <th style={styles.th}>Quantity</th>
                                    <th style={styles.th}>Patient/Nurse</th>
                                    <th style={styles.th}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map(activity => (
                                    <tr key={activity._id}>
                                        <td style={styles.td}>{formatDate(activity.createdAt)}</td>
                                        <td style={styles.td}>
                                            <strong>{activity.wardName}</strong>
                                            {activity.wardNumber && <div style={{ fontSize: '11px', color: '#6b7280' }}>{activity.wardNumber}</div>}
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.activityBadge,
                                                backgroundColor: `${getActivityColor(activity.activityType)}20`,
                                                color: getActivityColor(activity.activityType)
                                            }}>
                                                {getActivityIcon(activity.activityType)} {activity.activityType.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <strong>{activity.medicineName}</strong>
                                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{activity.weight}{activity.unit}</div>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{ fontWeight: 'bold', color: '#10b981' }}>{activity.quantity} units</span>
                                        </td>
                                        <td style={styles.td}>
                                            {activity.patientName ? (
                                                <div>
                                                    <div>👤 {activity.patientName}</div>
                                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>ID: {activity.patientId}</div>
                                                </div>
                                            ) : (
                                                <div>👩‍⚕️ {activity.nurseName || 'System'}</div>
                                            )}
                                        </td>
                                        <td style={styles.td}>
                                            <div style={{ fontSize: '12px', maxWidth: '200px' }}>
                                                {activity.notes || '-'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div style={styles.pagination}>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                style={{ ...styles.pageButton, opacity: page === 1 ? 0.5 : 1 }}
                            >
                                Previous
                            </button>
                            <span style={{ padding: '8px 12px' }}>
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                style={{ ...styles.pageButton, opacity: page === totalPages ? 0.5 : 1 }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WardActivities;