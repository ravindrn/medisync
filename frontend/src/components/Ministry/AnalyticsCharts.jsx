import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const AnalyticsCharts = ({ onRefresh }) => {
    const [analytics, setAnalytics] = useState({
        stockByDistrict: [],
        statusCounts: {},
        topMedicines: [],
        monthlyTransfers: [],
        stockByCategory: [],
        stockByHospitalType: [],
        districtComparison: []
    });
    const [loading, setLoading] = useState(true);
    const [chartType, setChartType] = useState('district');
    const [scale, setScale] = useState('linear');
    const [metric, setMetric] = useState('stock');
    const [timeRange, setTimeRange] = useState('6months');
    const [sortBy, setSortBy] = useState('quantity');
    const [showLegend, setShowLegend] = useState(true);
    const [chartHeight, setChartHeight] = useState(300);
    const [colorScheme, setColorScheme] = useState('blue');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ministry/analytics');
            const processedData = processAnalyticsData(response.data);
            setAnalytics(processedData);
            console.log('Analytics data:', processedData);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            toast.error('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const processAnalyticsData = (data) => {
        const categories = {};
        if (data.topMedicines) {
            data.topMedicines.forEach(med => {
                const category = getMedicineCategory(med._id.medicineName);
                if (!categories[category]) {
                    categories[category] = 0;
                }
                categories[category] += med.totalStock;
            });
        }
        
        return {
            ...data,
            stockByCategory: Object.entries(categories).map(([name, value]) => ({ name, value })),
            stockByHospitalType: []
        };
    };

    const getMedicineCategory = (medicineName) => {
        const categories = {
            'Paracetamol': 'Pain Relief',
            'Ibuprofen': 'Pain Relief',
            'Diclofenac': 'Pain Relief',
            'Aspirin': 'Pain Relief',
            'Amoxicillin': 'Antibiotic',
            'Ciprofloxacin': 'Antibiotic',
            'Azithromycin': 'Antibiotic',
            'Doxycycline': 'Antibiotic',
            'Metformin': 'Diabetes',
            'Amlodipine': 'Cardiovascular',
            'Losartan': 'Cardiovascular',
            'Atorvastatin': 'Cardiovascular',
            'Salbutamol': 'Respiratory',
            'Budesonide': 'Respiratory',
            'Cetirizine': 'Allergy',
            'Omeprazole': 'GI',
            'Vitamin C': 'Vitamin',
            'Calcium': 'Vitamin'
        };
        return categories[medicineName] || 'Other';
    };

    const getColorPalette = (index) => {
        const palettes = {
            blue: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'],
            green: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
            purple: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
            orange: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#ffedd5'],
            red: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2']
        };
        const palette = palettes[colorScheme] || palettes.blue;
        return palette[index % palette.length];
    };

    const getMaxValue = (data, key) => {
        if (!data || data.length === 0) return 100;
        return Math.max(...data.map(item => item[key])) * 1.1;
    };

    const applyScale = (value) => {
        if (scale === 'log') {
            return Math.log(value + 1);
        }
        return value;
    };

    const renderDistrictChart = () => {
        const data = analytics.stockByDistrict || [];
        const sortedData = [...data].sort((a, b) => {
            if (sortBy === 'quantity') return b.totalStock - a.totalStock;
            return b.medicineCount - a.medicineCount;
        });
        const maxStock = getMaxValue(sortedData, 'totalStock');
        
        return (
            <div>
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Sort By:</label>
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="quantity">Stock Quantity</option>
                            <option value="count">Medicine Count</option>
                        </select>
                    </div>
                </div>
                
                {sortedData.map((district, idx) => {
                    const barValue = metric === 'stock' ? district.totalStock : district.medicineCount;
                    const barWidth = (barValue / maxStock) * 100;
                    const color = getColorPalette(idx);
                    
                    return (
                        <div key={idx} style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontWeight: '500' }}>{district._id}</span>
                                <span style={{ color: color, fontWeight: 'bold' }}>
                                    {metric === 'stock' ? `${district.totalStock.toLocaleString()} units` : `${district.medicineCount} medicines`}
                                </span>
                            </div>
                            <div style={{
                                backgroundColor: '#e5e7eb',
                                borderRadius: '8px',
                                height: `${chartHeight / 15}px`,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                transition: 'all 0.3s'
                            }}>
                                <div style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: color,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: '10px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    transition: 'width 0.5s'
                                }}>
                                    {barWidth > 15 && `${Math.round(barWidth)}%`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStatusChart = () => {
        const statuses = analytics.statusCounts || {};
        const total = Object.values(statuses).reduce((a, b) => a + b, 0);
        
        const statusColors = {
            Available: '#10b981',
            'Low Stock': '#f59e0b',
            Critical: '#ef4444',
            'Out of Stock': '#6b7280'
        };
        
        let cumulative = 0;
        const segments = Object.entries(statuses).map(([status, count]) => {
            const percentage = (count / total) * 100;
            const start = cumulative;
            cumulative += percentage;
            return { status, count, percentage, start, color: statusColors[status] };
        });
        
        return (
            <div>
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Chart Height:</label>
                        <input 
                            type="range" 
                            min="200" 
                            max="500" 
                            value={chartHeight}
                            onChange={(e) => setChartHeight(parseInt(e.target.value))}
                            style={{ marginLeft: '8px', width: '150px' }}
                        />
                        <span style={{ marginLeft: '8px', fontSize: '12px' }}>{chartHeight}px</span>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>
                            <input 
                                type="checkbox" 
                                checked={showLegend} 
                                onChange={(e) => setShowLegend(e.target.checked)}
                                style={{ marginRight: '5px' }}
                            />
                            Show Legend
                        </label>
                    </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
                    <div style={{ width: `${Math.min(chartHeight, 300)}px`, height: `${Math.min(chartHeight, 300)}px`, position: 'relative' }}>
                        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                            {segments.map((segment, idx) => (
                                <circle
                                    key={idx}
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke={segment.color}
                                    strokeWidth="20"
                                    strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                                    strokeDashoffset={-segment.start}
                                />
                            ))}
                        </svg>
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: `${Math.min(chartHeight / 10, 24)}px`, fontWeight: 'bold' }}>{total}</div>
                            <div style={{ fontSize: '10px', color: '#6b7280' }}>Total Items</div>
                        </div>
                    </div>
                    
                    {showLegend && (
                        <div>
                            {segments.map((segment, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: segment.color,
                                        borderRadius: '2px',
                                        marginRight: '8px'
                                    }}></div>
                                    <span style={{ width: '100px' }}>{segment.status}:</span>
                                    <span style={{ fontWeight: 'bold', marginLeft: '10px' }}>{segment.count}</span>
                                    <span style={{ color: '#6b7280', marginLeft: '5px' }}>({segment.percentage.toFixed(1)}%)</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTopMedicinesChart = () => {
        const medicines = analytics.topMedicines || [];
        const maxStock = getMaxValue(medicines, 'totalStock');
        const displayCount = Math.min(medicines.length, 15);
        
        return (
            <div>
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Scale:</label>
                        <select 
                            value={scale} 
                            onChange={(e) => setScale(e.target.value)}
                            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="linear">Linear Scale</option>
                            <option value="log">Log Scale</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Color Scheme:</label>
                        <select 
                            value={colorScheme} 
                            onChange={(e) => setColorScheme(e.target.value)}
                            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="purple">Purple</option>
                            <option value="orange">Orange</option>
                            <option value="red">Red</option>
                        </select>
                    </div>
                </div>
                
                {medicines.slice(0, displayCount).map((medicine, idx) => {
                    const stockValue = applyScale(medicine.totalStock);
                    const maxValue = applyScale(maxStock);
                    const barWidth = (stockValue / maxValue) * 100;
                    const color = getColorPalette(idx);
                    
                    return (
                        <div key={idx} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontWeight: '500', fontSize: '13px' }}>
                                    {medicine._id.medicineName} ({medicine._id.weight}{medicine._id.unit})
                                </span>
                                <span style={{ color: color, fontWeight: 'bold', fontSize: '13px' }}>
                                    {medicine.totalStock.toLocaleString()} units
                                </span>
                            </div>
                            <div style={{
                                backgroundColor: '#e5e7eb',
                                borderRadius: '8px',
                                height: '25px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: color,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: '10px',
                                    color: 'white',
                                    fontSize: '11px',
                                    fontWeight: '500'
                                }}>
                                    {barWidth > 15 && `${Math.round(medicine.totalStock / 1000)}K`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderCategoryChart = () => {
        const categories = analytics.stockByCategory || [];
        const maxValue = getMaxValue(categories, 'value');
        
        return (
            <div>
                {categories.map((cat, idx) => {
                    const barWidth = (cat.value / maxValue) * 100;
                    const color = getColorPalette(idx);
                    
                    return (
                        <div key={idx} style={{ marginBottom: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontWeight: '500' }}>{cat.name}</span>
                                <span style={{ color: color, fontWeight: 'bold' }}>
                                    {cat.value.toLocaleString()} units
                                </span>
                            </div>
                            <div style={{
                                backgroundColor: '#e5e7eb',
                                borderRadius: '8px',
                                height: '30px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${barWidth}%`,
                                    backgroundColor: color,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    paddingLeft: '10px',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: '500'
                                }}>
                                    {barWidth > 15 && `${cat.name}`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderMonthlyTrends = () => {
        const months = analytics.monthlyTransfers || [];
        const maxQuantity = getMaxValue(months, 'totalQuantity');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const getMonthsToShow = () => {
            if (timeRange === '3months') return months.slice(-3);
            if (timeRange === '12months') return months.slice(-12);
            return months.slice(-6);
        };
        
        const displayMonths = getMonthsToShow();
        
        return (
            <div>
                <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Time Range:</label>
                        <select 
                            value={timeRange} 
                            onChange={(e) => setTimeRange(e.target.value)}
                            style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                        >
                            <option value="3months">Last 3 Months</option>
                            <option value="6months">Last 6 Months</option>
                            <option value="12months">Last 12 Months</option>
                        </select>
                    </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: `${chartHeight}px`, marginTop: '20px' }}>
                    {displayMonths.map((month, idx) => {
                        const height = (month.totalQuantity / maxQuantity) * (chartHeight - 50);
                        const monthName = `${monthNames[month._id.month - 1]} ${month._id.year}`;
                        const color = getColorPalette(idx);
                        
                        return (
                            <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{
                                    height: `${height}px`,
                                    backgroundColor: color,
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.3s',
                                    marginBottom: '8px',
                                    cursor: 'pointer',
                                    position: 'relative'
                                }} />
                                <div style={{ fontSize: '11px', color: '#6b7280' }}>{monthName}</div>
                                <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                                    {Math.round(month.totalQuantity / 1000)}K
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const styles = {
        container: { padding: '10px' },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        chartButtons: {
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '20px',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '10px'
        },
        chartButton: {
            padding: '8px 16px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s'
        },
        activeChart: {
            backgroundColor: '#3b82f6',
            color: 'white',
            borderColor: '#3b82f6'
        },
        chartContainer: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '20px'
        },
        controlsBar: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
        },
        refreshButton: {
            padding: '6px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading analytics...</div>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2>📊 Analytics & Trends</h2>
                <button onClick={fetchAnalytics} style={styles.refreshButton}>
                    🔄 Refresh Data
                </button>
            </div>

            <div style={styles.chartButtons}>
                <button
                    onClick={() => setChartType('district')}
                    style={{ ...styles.chartButton, ...(chartType === 'district' ? styles.activeChart : {}) }}
                >
                    📍 Stock by District
                </button>
                <button
                    onClick={() => setChartType('status')}
                    style={{ ...styles.chartButton, ...(chartType === 'status' ? styles.activeChart : {}) }}
                >
                    📊 Stock Status
                </button>
                <button
                    onClick={() => setChartType('top')}
                    style={{ ...styles.chartButton, ...(chartType === 'top' ? styles.activeChart : {}) }}
                >
                    💊 Top Medicines
                </button>
                <button
                    onClick={() => setChartType('category')}
                    style={{ ...styles.chartButton, ...(chartType === 'category' ? styles.activeChart : {}) }}
                >
                    🏷️ By Category
                </button>
                <button
                    onClick={() => setChartType('trends')}
                    style={{ ...styles.chartButton, ...(chartType === 'trends' ? styles.activeChart : {}) }}
                >
                    📈 Monthly Trends
                </button>
            </div>

            <div style={styles.controlsBar}>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ fontSize: '12px', color: '#6b7280' }}>Chart Height:</label>
                        <input 
                            type="range" 
                            min="200" 
                            max="500" 
                            value={chartHeight}
                            onChange={(e) => setChartHeight(parseInt(e.target.value))}
                            style={{ marginLeft: '8px', width: '120px' }}
                        />
                        <span style={{ marginLeft: '8px', fontSize: '12px' }}>{chartHeight}px</span>
                    </div>
                    {(chartType === 'top' || chartType === 'category') && (
                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>Color Scheme:</label>
                            <select 
                                value={colorScheme} 
                                onChange={(e) => setColorScheme(e.target.value)}
                                style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px' }}
                            >
                                <option value="blue">Blue</option>
                                <option value="green">Green</option>
                                <option value="purple">Purple</option>
                                <option value="orange">Orange</option>
                                <option value="red">Red</option>
                            </select>
                        </div>
                    )}
                    {chartType === 'top' && (
                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>Scale:</label>
                            <select 
                                value={scale} 
                                onChange={(e) => setScale(e.target.value)}
                                style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px' }}
                            >
                                <option value="linear">Linear</option>
                                <option value="log">Logarithmic</option>
                            </select>
                        </div>
                    )}
                    {chartType === 'district' && (
                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>Sort By:</label>
                            <select 
                                value={sortBy} 
                                onChange={(e) => setSortBy(e.target.value)}
                                style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px' }}
                            >
                                <option value="quantity">Stock Quantity</option>
                                <option value="count">Medicine Count</option>
                            </select>
                        </div>
                    )}
                    {chartType === 'status' && (
                        <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>
                                <input 
                                    type="checkbox" 
                                    checked={showLegend} 
                                    onChange={(e) => setShowLegend(e.target.checked)}
                                    style={{ marginRight: '5px' }}
                                />
                                Show Legend
                            </label>
                        </div>
                    )}
                </div>
            </div>

            <div style={styles.chartContainer}>
                {chartType === 'district' && renderDistrictChart()}
                {chartType === 'status' && renderStatusChart()}
                {chartType === 'top' && renderTopMedicinesChart()}
                {chartType === 'category' && renderCategoryChart()}
                {chartType === 'trends' && renderMonthlyTrends()}
            </div>
        </div>
    );
};

export default AnalyticsCharts;