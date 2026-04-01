import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import StockAggregationTable from './StockAggregationTable';
import ShortageAlerts from './ShortageAlerts';
import ExcessStockList from './ExcessStockList';
import AnalyticsCharts from './AnalyticsCharts';
import ShortagePredictions from './ShortagePredictions';
import ExportReportButton from './ExportReportButton';
import ReportsHistory from './ReportsHistory';

const MinistryDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState({
        totalHospitals: 0,
        totalMedicineTypes: 0,
        totalStockUnits: 0,
        lowStockCount: 0,
        criticalStockCount: 0,
        outOfStockCount: 0,
        lowStockItems: [],
        hospitalsWithLowStock: []
    });
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshReports, setRefreshReports] = useState(false);
    
    // Filter states
    const [filters, setFilters] = useState({
        district: 'all',
        stockStatus: 'all',
        searchTerm: '',
        minStock: '',
        maxStock: ''
    });
    const [districts, setDistricts] = useState(['all']);

    useEffect(() => {
        fetchDashboardStats();
        fetchDistricts();
    }, []);

    const fetchDashboardStats = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ministry/dashboard');
            setStats(response.data);
            setLastUpdated(new Date());
            console.log('Dashboard stats:', response.data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            const districtList = ['all', ...response.data];
            setDistricts(districtList);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
        }
    };

    const refreshData = () => {
        fetchDashboardStats();
        setRefreshReports(prev => !prev);
    };

    const handleReportGenerated = () => {
        setRefreshReports(prev => !prev);
        toast.success('Report generated and saved to history');
    };

    // Filter low stock items
    const getFilteredLowStockItems = () => {
        let filtered = [...stats.lowStockItems];
        
        if (filters.district !== 'all') {
            filtered = filtered.filter(item => item.district === filters.district);
        }
        
        if (filters.stockStatus !== 'all') {
            filtered = filtered.filter(item => item.status === filters.stockStatus);
        }
        
        if (filters.searchTerm) {
            filtered = filtered.filter(item => 
                item.medicineName.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
        }
        
        if (filters.minStock) {
            filtered = filtered.filter(item => item.quantity >= parseInt(filters.minStock));
        }
        if (filters.maxStock) {
            filtered = filtered.filter(item => item.quantity <= parseInt(filters.maxStock));
        }
        
        return filtered;
    };

    // Filter hospitals with low stock
    const getFilteredHospitals = () => {
        let filtered = [...stats.hospitalsWithLowStock];
        
        if (filters.district !== 'all') {
            filtered = filtered.filter(h => h.district === filters.district);
        }
        
        if (filters.searchTerm) {
            filtered = filtered.filter(h => 
                h.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
        }
        
        return filtered;
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setFilters({
            district: 'all',
            stockStatus: 'all',
            searchTerm: '',
            minStock: '',
            maxStock: ''
        });
    };

    const filteredLowStockItems = getFilteredLowStockItems();
    const filteredHospitals = getFilteredHospitals();

    const tabs = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'stock', label: 'Stock Aggregation', icon: '💊' },
        { id: 'shortages', label: 'Shortage Alerts', icon: '⚠️' },
        { id: 'excess', label: 'Excess Stock', icon: '📦' },
        { id: 'analytics', label: 'Analytics', icon: '📈' },
        { id: 'predictions', label: 'Predictions', icon: '🔮' },
        { id: 'reports', label: 'Reports History', icon: '📋' }
    ];

    const styles = {
        container: {
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '20px'
        },
        header: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        headerTop: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '15px'
        },
        title: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#1e293b'
        },
        subtitle: {
            color: '#64748b',
            marginTop: '5px'
        },
        refreshBar: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '15px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        lastUpdated: {
            fontSize: '12px',
            color: '#6b7280'
        },
        refreshButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        },
        statsGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
        },
        statCard: {
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
        },
        statValue: {
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '10px'
        },
        statLabel: {
            fontSize: '14px',
            color: '#6b7280'
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
        filterSelect: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white'
        },
        filterInput: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px'
        },
        clearButton: {
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            marginTop: '10px'
        },
        filterStats: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        resultCount: {
            fontSize: '13px',
            color: '#6b7280'
        },
        tabs: {
            display: 'flex',
            gap: '10px',
            marginBottom: '20px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            flexWrap: 'wrap',
            overflowX: 'auto'
        },
        tab: {
            padding: '10px 20px',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            fontSize: '15px',
            fontWeight: '500',
            borderRadius: '8px',
            transition: 'all 0.3s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
        },
        activeTab: {
            backgroundColor: '#3b82f6',
            color: 'white'
        },
        content: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            minHeight: '500px'
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
        statusBadge: {
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
        }
    };

    const getStatColor = (type, value) => {
        if (type === 'critical') return '#ef4444';
        if (type === 'low') return '#f59e0b';
        if (type === 'out') return '#dc2626';
        return '#3b82f6';
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading dashboard...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.headerTop}>
                    <div>
                        <h1 style={styles.title}>Ministry of Health Dashboard</h1>
                        <p style={styles.subtitle}>National Medicine Stock Monitoring System</p>
                    </div>
                    <ExportReportButton onReportGenerated={handleReportGenerated} />
                </div>
                
                <div style={styles.refreshBar}>
                    <div style={styles.lastUpdated}>
                        Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'Not updated yet'}
                    </div>
                    <button onClick={refreshData} style={styles.refreshButton}>
                        🔄 Refresh Data
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.totalHospitals}</div>
                    <div style={styles.statLabel}>Total Hospitals</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#10b981' }}>{stats.totalMedicineTypes}</div>
                    <div style={styles.statLabel}>Medicine Types</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#8b5cf6' }}>{stats.totalStockUnits.toLocaleString()}</div>
                    <div style={styles.statLabel}>Total Stock Units</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: getStatColor('critical', stats.criticalStockCount) }}>
                        {stats.criticalStockCount}
                    </div>
                    <div style={styles.statLabel}>Critical Stock</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: getStatColor('low', stats.lowStockCount) }}>
                        {stats.lowStockCount}
                    </div>
                    <div style={styles.statLabel}>Low Stock Items</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: getStatColor('out', stats.outOfStockCount) }}>
                        {stats.outOfStockCount}
                    </div>
                    <div style={styles.statLabel}>Out of Stock</div>
                </div>
            </div>

            {/* Filter Section - Only for Overview Tab */}
            {activeTab === 'overview' && (
                <div style={styles.filterSection}>
                    <div style={styles.filterTitle}>🔍 Filter Data</div>
                    <div style={styles.filterGrid}>
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>District</label>
                            <select
                                value={filters.district}
                                onChange={(e) => handleFilterChange('district', e.target.value)}
                                style={styles.filterSelect}
                            >
                                {districts.map(district => (
                                    <option key={district} value={district}>
                                        {district === 'all' ? 'All Districts' : district}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Stock Status</label>
                            <select
                                value={filters.stockStatus}
                                onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                                style={styles.filterSelect}
                            >
                                <option value="all">All Status</option>
                                <option value="Critical">Critical (&lt;10 units)</option>
                                <option value="Low Stock">Low Stock (10-50 units)</option>
                            </select>
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Medicine Name</label>
                            <input
                                type="text"
                                placeholder="Search medicine..."
                                value={filters.searchTerm}
                                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                style={styles.filterInput}
                            />
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Min Stock (units)</label>
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minStock}
                                onChange={(e) => handleFilterChange('minStock', e.target.value)}
                                style={styles.filterInput}
                            />
                        </div>
                        
                        <div style={styles.filterGroup}>
                            <label style={styles.filterLabel}>Max Stock (units)</label>
                            <input
                                type="number"
                                placeholder="Max"
                                value={filters.maxStock}
                                onChange={(e) => handleFilterChange('maxStock', e.target.value)}
                                style={styles.filterInput}
                            />
                        </div>
                    </div>
                    
                    {(filters.district !== 'all' || filters.stockStatus !== 'all' || filters.searchTerm || filters.minStock || filters.maxStock) && (
                        <button onClick={clearFilters} style={styles.clearButton}>
                            Clear All Filters
                        </button>
                    )}
                </div>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            ...styles.tab,
                            ...(activeTab === tab.id ? styles.activeTab : {})
                        }}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={styles.content}>
                {activeTab === 'overview' && (
                    <div>
                        <div style={styles.filterStats}>
                            <h2>National Overview</h2>
                            <div style={styles.resultCount}>
                                Showing {filteredLowStockItems.length} low stock items | {filteredHospitals.length} hospitals affected
                            </div>
                        </div>
                        <p style={{ color: '#6b7280', marginBottom: '20px' }}>
                            Summary of medicine stock status across all hospitals
                        </p>
                        
                        {/* Hospitals with Low Stock */}
                        {filteredHospitals.length > 0 && (
                            <div style={{ marginBottom: '30px' }}>
                                <h3>⚠️ Hospitals with Low Stock</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                                <th style={styles.th}>Hospital</th>
                                                <th style={styles.th}>District</th>
                                                <th style={styles.th}>Low Stock Items</th>
                                                <th style={styles.th}>Critical Items</th>
                                              </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHospitals.map((hospital, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={styles.td}>{hospital.name}</td>
                                                    <td style={styles.td}>{hospital.district}</td>
                                                    <td style={{ ...styles.td, color: '#f59e0b' }}>{hospital.lowStockCount}</td>
                                                    <td style={{ ...styles.td, color: '#ef4444' }}>{hospital.criticalCount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Recent Low Stock Items */}
                        {filteredLowStockItems.length > 0 && (
                            <div>
                                <h3>📋 Low Stock Alerts</h3>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                                <th style={styles.th}>Medicine</th>
                                                <th style={styles.th}>Strength</th>
                                                <th style={styles.th}>Hospital</th>
                                                <th style={styles.th}>District</th>
                                                <th style={styles.th}>Available</th>
                                                <th style={styles.th}>Status</th>
                                               </tr>
                                        </thead>
                                        <tbody>
                                            {filteredLowStockItems.map((item, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={styles.td}>{item.medicineName}</td>
                                                    <td style={styles.td}>{item.weight}{item.unit}</td>
                                                    <td style={styles.td}>{item.hospitalName}</td>
                                                    <td style={styles.td}>{item.district}</td>
                                                    <td style={{ ...styles.td, fontWeight: 'bold', color: '#ef4444' }}>{item.quantity} units</td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            ...styles.statusBadge,
                                                            backgroundColor: item.status === 'Critical' ? '#fee2e2' : '#fef3c7',
                                                            color: item.status === 'Critical' ? '#dc2626' : '#d97706'
                                                        }}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {filteredLowStockItems.length === 0 && filteredHospitals.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                No data matches your filters. Try adjusting your filter criteria.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'stock' && (
                    <StockAggregationTable onRefresh={refreshData} />
                )}

                {activeTab === 'shortages' && (
                    <ShortageAlerts onRefresh={refreshData} />
                )}

                {activeTab === 'excess' && (
                    <ExcessStockList onRefresh={refreshData} />
                )}

                {activeTab === 'analytics' && (
                    <AnalyticsCharts onRefresh={refreshData} />
                )}

                {activeTab === 'predictions' && (
                    <ShortagePredictions onRefresh={refreshData} />
                )}

                {activeTab === 'reports' && (
                    <ReportsHistory refreshTrigger={refreshReports} onRefresh={refreshData} />
                )}
            </div>
        </div>
    );
};

export default MinistryDashboard;