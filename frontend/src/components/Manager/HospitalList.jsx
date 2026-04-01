import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import TransferCart from './TransferCart';

const HospitalList = ({ onRequestTransfer, currentHospitalId, onRefresh }) => {
    const [allHospitals, setAllHospitals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [districts, setDistricts] = useState([]);
    const [expandedHospital, setExpandedHospital] = useState(null);
    const [hospitalStock, setHospitalStock] = useState({});
    const [myHospital, setMyHospital] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [quantities, setQuantities] = useState({});
    const [loadingStock, setLoadingStock] = useState(false);

    useEffect(() => {
        fetchDistricts();
    }, []);

    useEffect(() => {
        fetchHospitals();
    }, [selectedDistrict, searchTerm, currentHospitalId]);

    const fetchDistricts = async () => {
        try {
            const response = await api.get('/medicines/districts');
            setDistricts(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Failed to fetch districts:', error);
        }
    };

    const fetchHospitals = async () => {
        setLoading(true);
        try {
            const response = await api.get('/transfers/hospitals');
            let hospitals = Array.isArray(response.data) ? response.data : [];
            
            const currentId = currentHospitalId ? currentHospitalId.toString() : null;
            const loggedInHospital = hospitals.find(h => {
                const hospitalId = h._id ? h._id.toString() : null;
                return hospitalId === currentId;
            });
            
            if (loggedInHospital) {
                setMyHospital(loggedInHospital);
                hospitals = hospitals.filter(h => {
                    const hospitalId = h._id ? h._id.toString() : null;
                    return hospitalId !== currentId;
                });
            } else {
                setMyHospital(null);
            }
            
            if (selectedDistrict) {
                hospitals = hospitals.filter(h => h.district === selectedDistrict);
            }
            
            if (searchTerm.trim()) {
                hospitals = hospitals.filter(h =>
                    h.name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            
            setAllHospitals(hospitals);
        } catch (error) {
            console.error('Failed to fetch hospitals:', error);
            toast.error('Failed to load hospitals');
            setAllHospitals([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchHospitalStock = useCallback(async (hospitalId) => {
        if (expandedHospital === hospitalId) {
            setExpandedHospital(null);
            return;
        }

        setLoadingStock(true);
        try {
            const response = await api.get(`/transfers/hospital/${hospitalId}/stock`);
            const stockArray = Array.isArray(response.data)
                ? response.data
                : Array.isArray(response.data.stock)
                ? response.data.stock
                : [];

            setHospitalStock((prev) => ({
                ...prev,
                [hospitalId]: stockArray
            }));

            setExpandedHospital(hospitalId);
        } catch (error) {
            console.error('Failed to fetch hospital stock:', error);
            toast.error('Failed to load hospital stock');
            setHospitalStock((prev) => ({
                ...prev,
                [hospitalId]: []
            }));
            setExpandedHospital(hospitalId);
        } finally {
            setLoadingStock(false);
        }
    }, [expandedHospital]);

    const handleQuantityChange = (medicineId, value) => {
        setQuantities(prev => ({
            ...prev,
            [medicineId]: value
        }));
    };

    const addToCart = (hospital, medicine, quantity) => {
        setCartItems(prev => [...prev, {
            hospital,
            medicine: {
                ...medicine,
                medicineId: medicine.medicineId || medicine._id
            },
            quantity
        }]);
        toast.success(`Added ${medicine.medicineName} to cart`);
    };

    const removeFromCart = (index) => {
        setCartItems(prev => prev.filter((_, i) => i !== index));
        toast.success('Item removed from cart');
    };

    const clearCart = () => {
        setCartItems([]);
        toast.success('Cart cleared');
    };

    const handleSendCartRequest = async (items) => {
        const itemsByHospital = {};
        items.forEach(item => {
            const hospitalId = item.hospital._id;
            if (!itemsByHospital[hospitalId]) {
                itemsByHospital[hospitalId] = {
                    hospital: item.hospital,
                    medicines: []
                };
            }
            itemsByHospital[hospitalId].medicines.push({
                medicineId: item.medicine.medicineId,
                requestedQuantity: item.quantity
            });
        });

        let successCount = 0;
        let errorCount = 0;

        for (const [hospitalId, data] of Object.entries(itemsByHospital)) {
            try {
                await api.post('/transfers/request', {
                    toHospitalId: hospitalId,
                    medicines: data.medicines,
                    notes: `Multiple medicine request. Total ${data.medicines.length} items.`
                });
                toast.success(`Request sent to ${data.hospital.name}`);
                successCount++;
            } catch (error) {
                console.error('Failed to send request:', error);
                toast.error(`Failed to send request to ${data.hospital.name}: ${error.response?.data?.message}`);
                errorCount++;
            }
        }
        
        if (successCount > 0) {
            clearCart();
            setShowCart(false);
            if (onRefresh) onRefresh();
        }
    };

    const groupedHospitals = allHospitals.reduce((groups, hospital) => {
        if (hospital && hospital.district) {
            const district = hospital.district;
            if (!groups[district]) {
                groups[district] = [];
            }
            groups[district].push(hospital);
        }
        return groups;
    }, {});

    const getStatusColor = (available) => {
        if (available === 0) return '#dc2626';
        if (available < 50) return '#f59e0b';
        return '#10b981';
    };

    const getMedicineStrength = (medicine) => {
        if (medicine.weight && medicine.unit) {
            return `${medicine.weight}${medicine.unit}`;
        }
        if (medicine.strength) {
            return medicine.strength;
        }
        return 'N/A';
    };

    const getStockBadge = (quantity) => {
        if (quantity === 0) return { bg: '#fee2e2', color: '#dc2626', text: 'Out of Stock' };
        if (quantity < 10) return { bg: '#fee2e2', color: '#dc2626', text: 'Critical' };
        if (quantity < 50) return { bg: '#fef3c7', color: '#d97706', text: 'Low Stock' };
        return { bg: '#d1fae5', color: '#10b981', text: 'Available' };
    };

    const styles = {
        container: { padding: '10px' },
        headerWithCart: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '15px',
            flexWrap: 'wrap',
            gap: '10px'
        },
        cartButton: {
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500'
        },
        loadingSpinner: {
            display: 'inline-block',
            width: '20px',
            height: '20px',
            border: '2px solid #f3f3f3',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
        },
        myHospitalSection: {
            backgroundColor: '#f0f9ff',
            borderRadius: '12px',
            marginBottom: '30px',
            padding: '15px',
            border: '2px solid #3b82f6'
        },
        myHospitalTitle: {
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#0369a1',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        filters: {
            display: 'flex',
            gap: '15px',
            marginBottom: '20px',
            flexWrap: 'wrap'
        },
        filterSelect: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            minWidth: '200px',
            backgroundColor: 'white'
        },
        filterInput: {
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            fontSize: '14px',
            flex: 1,
            minWidth: '250px'
        },
        districtGroup: { marginBottom: '30px' },
        districtTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            paddingBottom: '8px',
            borderBottom: '2px solid #e5e7eb',
            color: '#374151'
        },
        hospitalCard: {
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            marginBottom: '12px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb'
        },
        hospitalCardMyHospital: {
            backgroundColor: '#f0f9ff',
            borderRadius: '12px',
            marginBottom: '12px',
            overflow: 'hidden',
            border: '2px solid #3b82f6'
        },
        hospitalHeader: {
            padding: '15px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            backgroundColor: 'white'
        },
        hospitalHeaderMyHospital: {
            padding: '15px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            backgroundColor: '#e0f2fe'
        },
        hospitalName: { fontSize: '16px', fontWeight: 'bold', color: '#1f2937' },
        hospitalNameMyHospital: { fontSize: '16px', fontWeight: 'bold', color: '#0369a1' },
        hospitalDetails: { fontSize: '13px', color: '#6b7280', marginTop: '5px' },
        stats: { display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' },
        statBadge: {
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            backgroundColor: '#f3f4f6'
        },
        expandIcon: { fontSize: '20px', color: '#9ca3af' },
        stockTable: { padding: '15px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' },
        table: { width: '100%', borderCollapse: 'collapse' },
        th: { padding: '10px', textAlign: 'left', backgroundColor: '#f3f4f6', fontSize: '13px', fontWeight: '600' },
        td: { padding: '10px', borderBottom: '1px solid #e5e7eb', fontSize: '13px' },
        addButton: {
            padding: '6px 12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
        },
        quantityInput: {
            width: '70px',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            textAlign: 'center'
        },
        actionContainer: { display: 'flex', gap: '8px', alignItems: 'center' },
        badge: { display: 'inline-block', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
        emptyMessage: {
            textAlign: 'center',
            padding: '40px',
            color: '#6b7280',
            backgroundColor: '#f9fafb',
            borderRadius: '12px'
        },
        managerBadge: {
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            marginLeft: '8px'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '40px' }}>Loading hospitals...</div>;
    }

    return (
        <div style={styles.container}>
            {/* Filters */}
            <div style={styles.filters}>
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

                <input
                    type="text"
                    placeholder="Search hospital by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.filterInput}
                />
            </div>

            {/* Your Hospital Section */}
            {myHospital && (
                <div style={styles.myHospitalSection}>
                    <div style={styles.myHospitalTitle}>
                        🏥 Your Hospital
                    </div>
                    <div style={styles.hospitalCardMyHospital}>
                        <div
                            style={styles.hospitalHeaderMyHospital}
                            onClick={() => fetchHospitalStock(myHospital._id)}
                        >
                            <div>
                                <div style={styles.hospitalNameMyHospital}>
                                    🏥 {myHospital.name}
                                    <span style={styles.managerBadge}>Manager</span>
                                </div>
                                <div style={styles.hospitalDetails}>
                                    📞 {myHospital.phone || 'N/A'} | 📧 {myHospital.email || 'N/A'}
                                </div>
                            </div>

                            <div style={styles.stats}>
                                <span style={styles.statBadge}>
                                    📦 {myHospital.stats?.totalItems || 0} medicines
                                </span>
                                <span style={styles.statBadge}>
                                    📊 {myHospital.stats?.totalStock || 0} units
                                </span>
                                {myHospital.stats?.lowStockCount > 0 && (
                                    <span
                                        style={{
                                            ...styles.statBadge,
                                            backgroundColor: '#fef3c7',
                                            color: '#d97706'
                                        }}
                                    >
                                        ⚠️ {myHospital.stats.lowStockCount} low
                                    </span>
                                )}
                                <span style={styles.expandIcon}>
                                    {expandedHospital === myHospital._id ? '▼' : '▶'}
                                </span>
                            </div>
                        </div>

                        {expandedHospital === myHospital._id && (
                            <div style={styles.stockTable}>
                                <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>
                                    Your Hospital Medicines:
                                </h4>
                                {loadingStock ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <div style={styles.loadingSpinner}></div> Loading...
                                    </div>
                                ) : (!hospitalStock[myHospital._id] || hospitalStock[myHospital._id].length === 0) ? (
                                    <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                        No medicines found
                                    </div>
                                ) : (
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>Medicine</th>
                                                <th style={styles.th}>Strength</th>
                                                <th style={styles.th}>Available</th>
                                                <th style={styles.th}>Status</th>
                                            </tr>
                                            </thead>
                                        <tbody>
                                            {hospitalStock[myHospital._id].map((medicine, idx) => {
                                                const badge = getStockBadge(medicine.availableQuantity);
                                                return (
                                                    <tr key={medicine.medicineId || medicine._id || idx}>
                                                        <td style={styles.td}>
                                                            <strong>{medicine.medicineName || medicine.name || 'Unnamed Medicine'}</strong>
                                                            {medicine.genericName && (
                                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                                    {medicine.genericName}
                                                                </div>
                                                            )}
                                                           </td>
                                                        <td style={styles.td}>
                                                            {getMedicineStrength(medicine)}
                                                           </td>
                                                        <td style={styles.td}>
                                                            <span style={{ fontWeight: 'bold', color: getStatusColor(medicine.availableQuantity || 0) }}>
                                                                {medicine.availableQuantity || 0} units
                                                            </span>
                                                           </td>
                                                        <td style={styles.td}>
                                                            <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.color }}>
                                                                {badge.text}
                                                            </span>
                                                           </td>
                                                       </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Other Hospitals Section */}
            {Object.keys(groupedHospitals).length === 0 ? (
                <div style={styles.emptyMessage}>
                    {searchTerm || selectedDistrict
                        ? 'No other hospitals found matching your criteria'
                        : 'No other hospitals available in the system'}
                </div>
            ) : (
                <div>
                    <div style={styles.headerWithCart}>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#374151' }}>
                            🏥 Other Hospitals
                        </h3>
                        {cartItems.length > 0 && (
                            <button onClick={() => setShowCart(true)} style={styles.cartButton}>
                                🛒 Cart ({cartItems.length} items)
                            </button>
                        )}
                    </div>
                    {Object.entries(groupedHospitals).map(([district, hospitalsList]) => (
                        <div key={district} style={styles.districtGroup}>
                            <div style={styles.districtTitle}>
                                📍 {district} ({hospitalsList.length} hospitals)
                            </div>

                            {hospitalsList.map((hospital) => {
                                const stockData = hospitalStock[hospital._id] || [];

                                return (
                                    <div key={hospital._id} style={styles.hospitalCard}>
                                        <div
                                            style={styles.hospitalHeader}
                                            onClick={() => fetchHospitalStock(hospital._id)}
                                        >
                                            <div>
                                                <div style={styles.hospitalName}>
                                                    🏥 {hospital.name}
                                                </div>
                                                <div style={styles.hospitalDetails}>
                                                    📞 {hospital.phone || 'N/A'} | 📧 {hospital.email || 'N/A'}
                                                </div>
                                            </div>

                                            <div style={styles.stats}>
                                                <span style={styles.statBadge}>
                                                    📦 {hospital.stats?.totalItems || 0} medicines
                                                </span>
                                                <span style={styles.statBadge}>
                                                    📊 {hospital.stats?.totalStock || 0} units
                                                </span>
                                                {hospital.stats?.lowStockCount > 0 && (
                                                    <span
                                                        style={{
                                                            ...styles.statBadge,
                                                            backgroundColor: '#fef3c7',
                                                            color: '#d97706'
                                                        }}
                                                    >
                                                        ⚠️ {hospital.stats.lowStockCount} low
                                                    </span>
                                                )}
                                                <span style={styles.expandIcon}>
                                                    {expandedHospital === hospital._id ? '▼' : '▶'}
                                                </span>
                                            </div>
                                        </div>

                                        {expandedHospital === hospital._id && (
                                            <div style={styles.stockTable}>
                                                <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>
                                                    Available Medicines:
                                                </h4>

                                                {loadingStock ? (
                                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                                        <div style={styles.loadingSpinner}></div> Loading...
                                                    </div>
                                                ) : stockData.length === 0 ? (
                                                    <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                                                        No medicines currently in stock
                                                    </div>
                                                ) : (
                                                    <table style={styles.table}>
                                                        <thead>
                                                             <tr>
                                                                <th style={styles.th}>Medicine</th>
                                                                <th style={styles.th}>Strength</th>
                                                                <th style={styles.th}>Available</th>
                                                                <th style={styles.th}>Status</th>
                                                                <th style={styles.th}>Action</th>
                                                             </tr>
                                                        </thead>
                                                        <tbody>
                                                            {stockData.map((medicine, idx) => {
                                                                const badge = getStockBadge(medicine.availableQuantity);
                                                                const medicineId = medicine.medicineId || medicine._id;
                                                                const currentQuantity = quantities[medicineId] || 1;
                                                                
                                                                return (
                                                                    <tr key={medicineId || idx}>
                                                                        <td style={styles.td}>
                                                                            <strong>{medicine.medicineName || medicine.name || 'Unnamed Medicine'}</strong>
                                                                            {medicine.genericName && (
                                                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                                                                                    {medicine.genericName}
                                                                                </div>
                                                                            )}
                                                                         </td>
                                                                        <td style={styles.td}>
                                                                            {getMedicineStrength(medicine)}
                                                                         </td>
                                                                        <td style={styles.td}>
                                                                            <span style={{ fontWeight: 'bold', color: getStatusColor(medicine.availableQuantity || 0) }}>
                                                                                {medicine.availableQuantity || 0} units
                                                                            </span>
                                                                         </td>
                                                                        <td style={styles.td}>
                                                                            <span style={{ ...styles.badge, backgroundColor: badge.bg, color: badge.color }}>
                                                                                {badge.text}
                                                                            </span>
                                                                         </td>
                                                                        <td style={styles.td}>
                                                                            {medicine.availableQuantity > 0 ? (
                                                                                <div style={styles.actionContainer}>
                                                                                    <input
                                                                                        type="number"
                                                                                        min="1"
                                                                                        max={medicine.availableQuantity}
                                                                                        value={currentQuantity}
                                                                                        onChange={(e) => handleQuantityChange(medicineId, parseInt(e.target.value) || 1)}
                                                                                        style={styles.quantityInput}
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    />
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            addToCart(hospital, medicine, currentQuantity);
                                                                                        }}
                                                                                        style={styles.addButton}
                                                                                    >
                                                                                        Add to Cart
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Out of Stock</span>
                                                                            )}
                                                                         </td>
                                                                     </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            )}

            {/* Cart Modal */}
            {showCart && (
                <TransferCart
                    cartItems={cartItems}
                    onRemoveItem={removeFromCart}
                    onClearCart={clearCart}
                    onSendRequest={handleSendCartRequest}
                    onClose={() => setShowCart(false)}
                />
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

export default HospitalList;