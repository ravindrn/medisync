import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const NurseDashboard = () => {
    const { user } = useAuth();
    const [stock, setStock] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [historyPrescriptions, setHistoryPrescriptions] = useState([]);
    const [historyStats, setHistoryStats] = useState({
        total: 0,
        active: 0,
        partial: 0,
        completed: 0,
        cancelled: 0
    });
    const [hospital, setHospital] = useState(null);
    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('stock');
    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [showDispenseModal, setShowDispenseModal] = useState(null);
    const [showEditPrescriptionModal, setShowEditPrescriptionModal] = useState(null);
    const [editPrescriptionData, setEditPrescriptionData] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [editQuantity, setEditQuantity] = useState(1);
    const [editDosage, setEditDosage] = useState('');
    const [editFrequency, setEditFrequency] = useState('');
    const [editDuration, setEditDuration] = useState('');
    const [editInstructions, setEditInstructions] = useState('');
    const [newMedicineItem, setNewMedicineItem] = useState({
        medicineId: '',
        quantity: 1,
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
    });
    const [updatingItem, setUpdatingItem] = useState(false);
    const [addingItem, setAddingItem] = useState(false);
    const [removingItem, setRemovingItem] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [historyFilters, setHistoryFilters] = useState({
        status: 'all',
        patientId: '',
        startDate: '',
        endDate: ''
    });
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);
    
    const [prescriptionForm, setPrescriptionForm] = useState({
        patientId: '',
        patientName: '',
        patientAge: '',
        patientGender: '',
        doctorName: '',
        items: [],
        notes: ''
    });
    
    const [prescriptionItem, setPrescriptionItem] = useState({
        medicineId: '',
        quantity: 1,
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
    });
    
    const [dispenseData, setDispenseData] = useState({
        prescriptionId: null,
        medicineId: null,
        quantity: 1,
        notes: ''
    });
    
    const [stats, setStats] = useState({
        totalItems: 0,
        totalQuantity: 0,
        alertCount: 0,
        activePrescriptions: 0
    });

    useEffect(() => {
        fetchHospitalStock();
        fetchActivePrescriptions();
    }, []);

    useEffect(() => {
        if (activeTab === 'history') {
            fetchPrescriptionHistory();
        }
    }, [activeTab, historyFilters, historyPage]);

    const fetchHospitalStock = async () => {
        setLoading(true);
        try {
            const response = await api.get('/nurse/stock');
            setStock(response.data.stock);
            setAlerts(response.data.alerts);
            setHospital(response.data.hospital);
            setStats({
                totalItems: response.data.totalItems,
                totalQuantity: response.data.totalQuantity,
                alertCount: response.data.alerts.length,
                activePrescriptions: 0
            });
        } catch (error) {
            console.error('Failed to fetch hospital stock:', error);
            toast.error('Failed to load hospital stock');
        } finally {
            setLoading(false);
        }
    };

    const fetchActivePrescriptions = async () => {
        try {
            const response = await api.get('/nurse/prescriptions/active');
            setPrescriptions(response.data.prescriptions);
            setStats(prev => ({
                ...prev,
                activePrescriptions: response.data.total
            }));
        } catch (error) {
            console.error('Failed to fetch prescriptions:', error);
        }
    };

    const fetchPrescriptionHistory = async () => {
        setHistoryLoading(true);
        try {
            const params = new URLSearchParams({
                page: historyPage,
                limit: 20,
                ...historyFilters
            });
            const response = await api.get(`/nurse/prescriptions/history?${params}`);
            setHistoryPrescriptions(response.data.prescriptions);
            setHistoryStats(response.data.stats);
            setHistoryTotalPages(response.data.pages);
        } catch (error) {
            console.error('Failed to fetch prescription history:', error);
            toast.error('Failed to load prescription history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleEditPrescription = async (prescription) => {
        try {
            const response = await api.get(`/nurse/prescription/${prescription._id}/edit`);
            setEditPrescriptionData(response.data);
            setShowEditPrescriptionModal(true);
        } catch (error) {
            console.error('Failed to load prescription for edit:', error);
            toast.error('Failed to load prescription data');
        }
    };

    const handleUpdateItemQuantity = async (prescriptionId, itemId, newQuantity) => {
        if (!newQuantity || newQuantity < 1) {
            toast.error('Please enter a valid quantity');
            return;
        }

        const medicine = stock.find(m => m.medicineId === editingItem?.medicineId);
        if (medicine && newQuantity > editingItem.prescribedQuantity) {
            const additionalNeeded = newQuantity - editingItem.prescribedQuantity;
            if (medicine.quantity < additionalNeeded) {
                toast.error(`Insufficient stock. Only ${medicine.quantity} units available for additional ${additionalNeeded} units`);
                return;
            }
        }

        setUpdatingItem(true);
        try {
            const response = await api.put(`/nurse/prescription/${prescriptionId}/update-item/${itemId}`, {
                quantity: newQuantity,
                dosage: editDosage,
                frequency: editFrequency,
                duration: editDuration,
                instructions: editInstructions
            });
            
            // Update local state immediately for live feedback
            setEditPrescriptionData(prev => {
                const updatedItems = prev.items.map(item => {
                    if (item._id === itemId) {
                        const dispensedQty = item.dispensedQuantity || 0;
                        return {
                            ...item,
                            prescribedQuantity: newQuantity,
                            remainingQuantity: newQuantity - dispensedQty,
                            dosage: editDosage || item.dosage,
                            frequency: editFrequency || item.frequency,
                            duration: editDuration || item.duration,
                            instructions: editInstructions || item.instructions
                        };
                    }
                    return item;
                });
                return { ...prev, items: updatedItems };
            });
            
            // Update stock locally
            if (medicine && newQuantity > editingItem.prescribedQuantity) {
                const additionalNeeded = newQuantity - editingItem.prescribedQuantity;
                setStock(prevStock => prevStock.map(s => 
                    s.medicineId === editingItem.medicineId 
                        ? { ...s, quantity: s.quantity - additionalNeeded }
                        : s
                ));
            }
            
            toast.success(response.data.message || 'Prescription item updated successfully');
            setEditingItem(null);
            fetchActivePrescriptions();
            if (activeTab === 'history') fetchPrescriptionHistory();
        } catch (error) {
            console.error('Failed to update item:', error);
            toast.error(error.response?.data?.message || 'Failed to update item');
        } finally {
            setUpdatingItem(false);
        }
    };

    const handleAddNewItemToPrescription = async (prescriptionId) => {
        if (!newMedicineItem.medicineId || !newMedicineItem.quantity) {
            toast.error('Please select a medicine and quantity');
            return;
        }

        const selectedMedicine = stock.find(m => m.medicineId === newMedicineItem.medicineId);
        if (selectedMedicine && newMedicineItem.quantity > selectedMedicine.quantity) {
            toast.error(`Only ${selectedMedicine.quantity} units available`);
            return;
        }

        setAddingItem(true);
        try {
            const response = await api.post(`/nurse/prescription/${prescriptionId}/add-item`, newMedicineItem);
            
            // Update local state immediately for live feedback
            const newItem = {
                ...newMedicineItem,
                _id: response.data?.prescription?.addedItem?._id || Date.now().toString(),
                medicineName: selectedMedicine.medicineName,
                weight: selectedMedicine.weight,
                unit: selectedMedicine.unit,
                prescribedQuantity: newMedicineItem.quantity,
                remainingQuantity: newMedicineItem.quantity,
                dispensedQuantity: 0,
                status: 'pending'
            };
            
            setEditPrescriptionData(prev => ({
                ...prev,
                items: [...prev.items, newItem]
            }));
            
            // Update stock locally
            setStock(prevStock => prevStock.map(s => 
                s.medicineId === newMedicineItem.medicineId 
                    ? { ...s, quantity: s.quantity - newMedicineItem.quantity }
                    : s
            ));
            
            toast.success(response.data.message || 'Medicine added to prescription');
            setNewMedicineItem({
                medicineId: '',
                quantity: 1,
                dosage: '',
                frequency: '',
                duration: '',
                instructions: ''
            });
            fetchActivePrescriptions();
            if (activeTab === 'history') fetchPrescriptionHistory();
        } catch (error) {
            console.error('Failed to add item:', error);
            toast.error(error.response?.data?.message || 'Failed to add item');
        } finally {
            setAddingItem(false);
        }
    };

    const handleRemoveItem = async (prescriptionId, itemId, itemName, quantity) => {
        if (window.confirm(`Are you sure you want to remove ${itemName} from this prescription?`)) {
            setRemovingItem(true);
            try {
                const response = await api.delete(`/nurse/prescription/${prescriptionId}/remove-item/${itemId}`);
                
                // Update local state immediately for live feedback
                setEditPrescriptionData(prev => ({
                    ...prev,
                    items: prev.items.filter(item => item._id !== itemId)
                }));
                
                // Restore stock locally
                setStock(prevStock => prevStock.map(s => 
                    s.medicineId === itemId 
                        ? { ...s, quantity: s.quantity + quantity }
                        : s
                ));
                
                toast.success(response.data.message || `${itemName} removed from prescription`);
                fetchActivePrescriptions();
                if (activeTab === 'history') fetchPrescriptionHistory();
            } catch (error) {
                console.error('Failed to remove item:', error);
                toast.error(error.response?.data?.message || 'Failed to remove item');
            } finally {
                setRemovingItem(false);
            }
        }
    };

    const handleAddPrescriptionItem = () => {
        if (!prescriptionItem.medicineId || !prescriptionItem.quantity) {
            toast.error('Please select a medicine and quantity');
            return;
        }

        const medicine = stock.find(m => m.medicineId === prescriptionItem.medicineId);
        if (!medicine) return;

        if (prescriptionItem.quantity > medicine.quantity) {
            toast.error(`Only ${medicine.quantity} units available`);
            return;
        }

        setPrescriptionForm({
            ...prescriptionForm,
            items: [...prescriptionForm.items, {
                medicineId: medicine.medicineId,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                quantity: prescriptionItem.quantity,
                dosage: prescriptionItem.dosage,
                frequency: prescriptionItem.frequency,
                duration: prescriptionItem.duration,
                instructions: prescriptionItem.instructions
            }]
        });

        setPrescriptionItem({
            medicineId: '',
            quantity: 1,
            dosage: '',
            frequency: '',
            duration: '',
            instructions: ''
        });
        toast.success('Medicine added to prescription');
    };

    const removePrescriptionItem = (index) => {
        const newItems = [...prescriptionForm.items];
        newItems.splice(index, 1);
        setPrescriptionForm({ ...prescriptionForm, items: newItems });
    };

    const handleCreatePrescription = async (e) => {
        e.preventDefault();
        
        if (!prescriptionForm.patientId || !prescriptionForm.patientName) {
            toast.error('Please enter patient ID and name');
            return;
        }
        
        if (prescriptionForm.items.length === 0) {
            toast.error('Please add at least one medicine to the prescription');
            return;
        }

        try {
            await api.post('/nurse/prescription', prescriptionForm);
            toast.success('Prescription created successfully');
            setShowPrescriptionModal(false);
            setPrescriptionForm({
                patientId: '',
                patientName: '',
                patientAge: '',
                patientGender: '',
                doctorName: '',
                items: [],
                notes: ''
            });
            fetchActivePrescriptions();
            fetchHospitalStock();
        } catch (error) {
            console.error('Failed to create prescription:', error);
            toast.error(error.response?.data?.message || 'Failed to create prescription');
        }
    };

    const handleDispenseFromPrescription = async () => {
        if (!dispenseData.prescriptionId || !dispenseData.medicineId || !dispenseData.quantity) {
            toast.error('Please select prescription, medicine, and quantity');
            return;
        }

        try {
            await api.post('/nurse/prescription/dispense', dispenseData);
            toast.success('Medicine dispensed successfully');
            setShowDispenseModal(null);
            setDispenseData({ prescriptionId: null, medicineId: null, quantity: 1, notes: '' });
            fetchHospitalStock();
            fetchActivePrescriptions();
            if (activeTab === 'history') {
                fetchPrescriptionHistory();
            }
        } catch (error) {
            console.error('Failed to dispense:', error);
            toast.error(error.response?.data?.message || 'Failed to dispense');
        }
    };

    const handleCancelPrescription = async (prescriptionId) => {
        if (window.confirm('Are you sure you want to cancel this prescription? This action cannot be undone.')) {
            try {
                await api.put(`/nurse/prescription/${prescriptionId}/cancel`, { reason: 'Cancelled by nurse' });
                toast.success('Prescription cancelled successfully');
                fetchActivePrescriptions();
                if (activeTab === 'history') {
                    fetchPrescriptionHistory();
                }
            } catch (error) {
                console.error('Failed to cancel prescription:', error);
                toast.error('Failed to cancel prescription');
            }
        }
    };

    const getStockBadge = (status) => {
        const badges = {
            Critical: { bg: '#fee2e2', color: '#dc2626', text: '⚠️ Critical' },
            'Low Stock': { bg: '#fef3c7', color: '#f59e0b', text: '📉 Low Stock' },
            Available: { bg: '#d1fae5', color: '#10b981', text: '✅ Available' },
            'Out of Stock': { bg: '#f3f4f6', color: '#6b7280', text: '❌ Out of Stock' }
        };
        return badges[status] || badges.Available;
    };

    const getPrescriptionStatusBadge = (status) => {
        const badges = {
            active: { bg: '#d1fae5', color: '#10b981', text: 'Active' },
            partial: { bg: '#fef3c7', color: '#f59e0b', text: 'Partial' },
            completed: { bg: '#d1fae5', color: '#10b981', text: 'Completed' },
            cancelled: { bg: '#fee2e2', color: '#dc2626', text: 'Cancelled' }
        };
        return badges[status] || badges.active;
    };

    const filteredStock = stock.filter(item =>
        item.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const styles = {
        container: { maxWidth: '1400px', margin: '0 auto', padding: '20px' },
        header: { backgroundColor: '#14b8a6', color: 'white', padding: '30px', borderRadius: '16px', marginBottom: '24px' },
        headerTitle: { fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' },
        headerSubtitle: { fontSize: '14px', opacity: 0.9 },
        statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' },
        statCard: { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' },
        statValue: { fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' },
        statLabel: { fontSize: '14px', color: '#6b7280' },
        tabs: { display: 'flex', gap: '10px', marginBottom: '20px', backgroundColor: 'white', padding: '10px', borderRadius: '12px', flexWrap: 'wrap' },
        tab: { padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'none', fontSize: '16px', fontWeight: '500', borderRadius: '8px' },
        activeTab: { backgroundColor: '#14b8a6', color: 'white' },
        newPrescriptionBtn: { backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', marginBottom: '20px' },
        searchBox: { marginBottom: '20px' },
        searchInput: { width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' },
        medicineCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb' },
        prescriptionCard: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', marginBottom: '16px', border: '1px solid #e5e7eb', transition: 'box-shadow 0.2s' },
        medicineHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' },
        medicineName: { fontSize: '18px', fontWeight: 'bold', color: '#1e293b' },
        stockBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' },
        quantity: { fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginTop: '8px' },
        dispenseButton: { backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
        editButton: { backgroundColor: '#f59e0b', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' },
        alertBanner: { backgroundColor: '#fee2e2', borderLeft: '4px solid #dc2626', padding: '15px', borderRadius: '8px', marginBottom: '20px' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modal: { backgroundColor: 'white', borderRadius: '12px', padding: '24px', maxWidth: '800px', width: '90%', maxHeight: '80vh', overflow: 'auto' },
        modalTitle: { fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' },
        formGroup: { marginBottom: '16px' },
        label: { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: '#374151' },
        input: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px' },
        select: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', backgroundColor: 'white' },
        textarea: { width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', minHeight: '60px' },
        modalButtons: { display: 'flex', gap: '10px', marginTop: '20px' },
        submitButton: { flex: 1, backgroundColor: '#10b981', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
        cancelButton: { flex: 1, backgroundColor: '#6b7280', color: 'white', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' },
        emptyState: { textAlign: 'center', padding: '60px', backgroundColor: 'white', borderRadius: '12px', color: '#6b7280' },
        row: { display: 'flex', gap: '10px', alignItems: 'center' },
        removeBtn: { backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
        filterRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px', backgroundColor: '#f9fafb', padding: '15px', borderRadius: '8px' },
        pagination: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' },
        pageButton: { padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', backgroundColor: 'white' },
        updatingText: { fontSize: '12px', color: '#6b7280', marginLeft: '8px' }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>Loading...</div>;
    }

    return (
        <div style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <h1 style={styles.headerTitle}>🏥 {hospital?.name} - {hospital?.ward} Ward</h1>
                <p style={styles.headerSubtitle}>Manage prescriptions and dispense medicines</p>
            </div>

            {/* Stats */}
            <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalItems}</div>
                    <div style={styles.statLabel}>Medicine Types</div>
                </div>
                <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalQuantity}</div>
                    <div style={styles.statLabel}>Total Units</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#f59e0b' }}>{stats.alertCount}</div>
                    <div style={styles.statLabel}>Low Stock Alerts</div>
                </div>
                <div style={styles.statCard}>
                    <div style={{ ...styles.statValue, color: '#3b82f6' }}>{stats.activePrescriptions}</div>
                    <div style={styles.statLabel}>Active Prescriptions</div>
                </div>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <div style={styles.alertBanner}>
                    <strong>⚠️ Low Stock Alerts:</strong> {alerts.map(a => a.medicineName).join(', ')}
                </div>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
                <button onClick={() => setActiveTab('stock')} style={{ ...styles.tab, ...(activeTab === 'stock' ? styles.activeTab : {}) }}>📦 Hospital Stock</button>
                <button onClick={() => setActiveTab('prescriptions')} style={{ ...styles.tab, ...(activeTab === 'prescriptions' ? styles.activeTab : {}) }}>📋 Active Prescriptions</button>
                <button onClick={() => setActiveTab('history')} style={{ ...styles.tab, ...(activeTab === 'history' ? styles.activeTab : {}) }}>📜 Prescription History</button>
                <button onClick={() => setActiveTab('alerts')} style={{ ...styles.tab, ...(activeTab === 'alerts' ? styles.activeTab : {}) }}>⚠️ Low Stock Alerts</button>
            </div>

            {/* Stock Tab */}
            {activeTab === 'stock' && (
                <>
                    <div style={styles.searchBox}>
                        <input
                            type="text"
                            placeholder="🔍 Search medicines..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={styles.searchInput}
                        />
                    </div>
                    <button onClick={() => setShowPrescriptionModal(true)} style={styles.newPrescriptionBtn}>
                        ✍️ Create New Prescription
                    </button>

                    {filteredStock.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                            <p>No medicines found</p>
                        </div>
                    ) : (
                        filteredStock.map(medicine => {
                            const badge = getStockBadge(medicine.status);
                            return (
                                <div key={medicine.medicineId} style={styles.medicineCard}>
                                    <div style={styles.medicineHeader}>
                                        <div style={styles.medicineName}>{medicine.medicineName}</div>
                                        <span style={{ ...styles.stockBadge, backgroundColor: badge.bg, color: badge.color }}>
                                            {badge.text}
                                        </span>
                                    </div>
                                    <div style={styles.quantity}>{medicine.quantity} units</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                        {medicine.weight}{medicine.unit}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </>
            )}

            {/* Active Prescriptions Tab */}
            {activeTab === 'prescriptions' && (
                <>
                    <button onClick={() => setShowPrescriptionModal(true)} style={styles.newPrescriptionBtn}>
                        ✍️ Create New Prescription
                    </button>

                    {prescriptions.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                            <p>No active prescriptions</p>
                            <p style={{ fontSize: '14px', marginTop: '8px' }}>Create a new prescription to get started</p>
                        </div>
                    ) : (
                        prescriptions.map(prescription => {
                            const statusBadge = getPrescriptionStatusBadge(prescription.status);
                            return (
                                <div key={prescription._id} style={styles.prescriptionCard}>
                                    <div style={styles.medicineHeader}>
                                        <div>
                                            <div style={styles.medicineName}>RX: {prescription.prescriptionId}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                Patient: {prescription.patientName} (ID: {prescription.patientId})
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span style={{ ...styles.stockBadge, backgroundColor: statusBadge.bg, color: statusBadge.color }}>
                                                {statusBadge.text}
                                            </span>
                                            <button
                                                onClick={() => handleEditPrescription(prescription)}
                                                style={{ ...styles.editButton, padding: '4px 12px', fontSize: '12px' }}
                                            >
                                                ✏️ Edit
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '12px' }}>
                                        {prescription.items.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                                <span>{item.medicineName} ({item.weight}{item.unit})</span>
                                                <div>
                                                    <span>Prescribed: {item.prescribedQuantity} | </span>
                                                    <span style={{ color: '#10b981' }}>Remaining: {item.remainingQuantity}</span>
                                                    {item.remainingQuantity > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setDispenseData({
                                                                    prescriptionId: prescription._id,
                                                                    medicineId: item.medicineId,
                                                                    quantity: 1,
                                                                    notes: ''
                                                                });
                                                                setShowDispenseModal(true);
                                                            }}
                                                            style={{ ...styles.dispenseButton, marginTop: 0, marginLeft: '10px', padding: '4px 12px', fontSize: '12px' }}
                                                        >
                                                            Dispense
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                                        {prescription.doctorName && (
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                👨‍⚕️ Doctor: {prescription.doctorName}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => handleCancelPrescription(prescription._id)}
                                            style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    {prescription.notes && (
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
                                            📝 Notes: {prescription.notes}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </>
            )}

            {/* Prescription History Tab - Same as before */}
            {activeTab === 'history' && (
                <>
                    <div style={styles.filterRow}>
                        <select
                            value={historyFilters.status}
                            onChange={(e) => setHistoryFilters({ ...historyFilters, status: e.target.value, page: 1 })}
                            style={styles.select}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="partial">Partial</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        <input
                            type="text"
                            placeholder="Search by Patient ID"
                            value={historyFilters.patientId}
                            onChange={(e) => setHistoryFilters({ ...historyFilters, patientId: e.target.value, page: 1 })}
                            style={styles.input}
                        />
                        <input
                            type="date"
                            placeholder="Start Date"
                            value={historyFilters.startDate}
                            onChange={(e) => setHistoryFilters({ ...historyFilters, startDate: e.target.value, page: 1 })}
                            style={styles.input}
                        />
                        <input
                            type="date"
                            placeholder="End Date"
                            value={historyFilters.endDate}
                            onChange={(e) => setHistoryFilters({ ...historyFilters, endDate: e.target.value, page: 1 })}
                            style={styles.input}
                        />
                    </div>

                    <div style={{ ...styles.statsGrid, marginBottom: '20px' }}>
                        <div style={styles.statCard}>
                            <div style={styles.statValue}>{historyStats.total}</div>
                            <div style={styles.statLabel}>Total Prescriptions</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={{ ...styles.statValue, color: '#10b981' }}>{historyStats.active + historyStats.partial}</div>
                            <div style={styles.statLabel}>Active/Partial</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={{ ...styles.statValue, color: '#3b82f6' }}>{historyStats.completed}</div>
                            <div style={styles.statLabel}>Completed</div>
                        </div>
                        <div style={styles.statCard}>
                            <div style={{ ...styles.statValue, color: '#dc2626' }}>{historyStats.cancelled}</div>
                            <div style={styles.statLabel}>Cancelled</div>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>Loading history...</div>
                    ) : historyPrescriptions.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
                            <p>No prescription history found</p>
                        </div>
                    ) : (
                        <>
                            {historyPrescriptions.map(prescription => {
                                const statusBadge = getPrescriptionStatusBadge(prescription.status);
                                const totalPrescribed = prescription.items.reduce((sum, i) => sum + i.prescribedQuantity, 0);
                                const totalDispensed = prescription.items.reduce((sum, i) => sum + (i.dispensedQuantity || 0), 0);
                                
                                return (
                                    <div key={prescription._id} style={styles.prescriptionCard}>
                                        <div style={styles.medicineHeader}>
                                            <div>
                                                <div style={styles.medicineName}>RX: {prescription.prescriptionId}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                    Patient: {prescription.patientName} (ID: {prescription.patientId})
                                                </div>
                                            </div>
                                            <span style={{ ...styles.stockBadge, backgroundColor: statusBadge.bg, color: statusBadge.color }}>
                                                {statusBadge.text}
                                            </span>
                                        </div>
                                        
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>
                                                <span>Medicine</span>
                                                <span>Prescribed | Dispensed | Remaining</span>
                                            </div>
                                            {prescription.items.map((item, idx) => (
                                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                                    <span>{item.medicineName} ({item.weight}{item.unit})</span>
                                                    <span>
                                                        {item.prescribedQuantity} | {item.dispensedQuantity || 0} | {item.remainingQuantity}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                        
                                        <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                                            <div>Created: {formatDate(prescription.createdAt)}</div>
                                            {prescription.completedAt && <div>Completed: {formatDate(prescription.completedAt)}</div>}
                                            {prescription.cancelledAt && <div>Cancelled: {formatDate(prescription.cancelledAt)}</div>}
                                            {prescription.doctorName && <div>👨‍⚕️ Doctor: {prescription.doctorName}</div>}
                                            {prescription.notes && <div>📝 Notes: {prescription.notes}</div>}
                                        </div>
                                        
                                        <div style={{ marginTop: '12px' }}>
                                            <div>Total: {totalPrescribed} units prescribed | {totalDispensed} units dispensed</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                Completion: {Math.round((totalDispensed / totalPrescribed) * 100)}%
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            
                            {historyTotalPages > 1 && (
                                <div style={styles.pagination}>
                                    <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1} style={{ ...styles.pageButton, opacity: historyPage === 1 ? 0.5 : 1 }}>Previous</button>
                                    <span style={{ padding: '8px 12px' }}>Page {historyPage} of {historyTotalPages}</span>
                                    <button onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))} disabled={historyPage === historyTotalPages} style={{ ...styles.pageButton, opacity: historyPage === historyTotalPages ? 0.5 : 1 }}>Next</button>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
                <div>
                    {alerts.length === 0 ? (
                        <div style={styles.emptyState}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                            <p>No low stock alerts</p>
                        </div>
                    ) : (
                        alerts.map(alert => (
                            <div key={alert.medicineName} style={{ ...styles.medicineCard, backgroundColor: '#fef3c7' }}>
                                <div style={styles.medicineHeader}>
                                    <div style={styles.medicineName}>{alert.medicineName}</div>
                                    <span style={{ ...styles.stockBadge, backgroundColor: '#fef3c7', color: '#f59e0b' }}>
                                        {alert.status === 'Critical' ? '⚠️ Critical' : '📉 Low Stock'}
                                    </span>
                                </div>
                                <div style={styles.quantity}>{alert.currentStock} units remaining</div>
                                <div style={{ fontSize: '12px', color: '#92400e', marginTop: '8px' }}>
                                    Please request restock from hospital manager
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Create Prescription Modal */}
            {showPrescriptionModal && (
                <div style={styles.modalOverlay} onClick={() => setShowPrescriptionModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Create New Prescription</h3>
                        <form onSubmit={handleCreatePrescription}>
                            <div style={styles.row}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Patient ID *</label>
                                    <input type="text" value={prescriptionForm.patientId} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientId: e.target.value })} style={styles.input} required />
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label style={styles.label}>Patient Name *</label>
                                    <input type="text" value={prescriptionForm.patientName} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientName: e.target.value })} style={styles.input} required />
                                </div>
                            </div>
                            <div style={styles.row}>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Age</label>
                                    <input type="number" value={prescriptionForm.patientAge} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientAge: e.target.value })} style={styles.input} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Gender</label>
                                    <select value={prescriptionForm.patientGender} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientGender: e.target.value })} style={styles.select}>
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={styles.label}>Doctor Name</label>
                                    <input type="text" value={prescriptionForm.doctorName} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, doctorName: e.target.value })} style={styles.input} />
                                </div>
                            </div>

                            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                                <label style={styles.label}>Add Medicine</label>
                                <div style={styles.row}>
                                    <select
                                        value={prescriptionItem.medicineId}
                                        onChange={(e) => setPrescriptionItem({ ...prescriptionItem, medicineId: e.target.value })}
                                        style={{ flex: 2, ...styles.select }}
                                    >
                                        <option value="">Select Medicine</option>
                                        {stock.map(m => (
                                            <option key={m.medicineId} value={m.medicineId}>
                                                {m.medicineName} ({m.weight}{m.unit}) - {m.quantity} units available
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={prescriptionItem.quantity}
                                        onChange={(e) => setPrescriptionItem({ ...prescriptionItem, quantity: parseInt(e.target.value) })}
                                        style={{ width: '80px', ...styles.input }}
                                        min="1"
                                    />
                                    <button type="button" onClick={handleAddPrescriptionItem} style={styles.submitButton}>Add</button>
                                </div>
                            </div>

                            {prescriptionForm.items.length > 0 && (
                                <div style={{ marginBottom: '16px', backgroundColor: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                                    <strong>Added Medicines:</strong>
                                    {prescriptionForm.items.map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                            <span>{item.medicineName} - {item.quantity} units</span>
                                            <button type="button" onClick={() => removePrescriptionItem(idx)} style={styles.removeBtn}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Notes</label>
                                <textarea rows="2" value={prescriptionForm.notes} onChange={(e) => setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })} style={styles.textarea} />
                            </div>

                            <div style={styles.modalButtons}>
                                <button type="submit" style={styles.submitButton}>Create Prescription</button>
                                <button type="button" onClick={() => setShowPrescriptionModal(false)} style={styles.cancelButton}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Prescription Modal - Live Updates */}
            {showEditPrescriptionModal && editPrescriptionData && (
                <div style={styles.modalOverlay} onClick={() => setShowEditPrescriptionModal(false)}>
                    <div style={{ ...styles.modal, maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Edit Prescription: {editPrescriptionData.prescriptionId}</h3>
                        <p>Patient: {editPrescriptionData.patientName} (ID: {editPrescriptionData.patientId})</p>
                        
                        {/* Current Items - Live Updates */}
                        <div style={{ marginTop: '20px' }}>
                            <h4 style={{ marginBottom: '12px' }}>Current Medicines</h4>
                            {editPrescriptionData.items.map((item, idx) => {
                                const medicineStock = stock.find(m => m.medicineId === item.medicineId);
                                return (
                                    <div key={idx} style={{ ...styles.prescriptionCard, padding: '12px', marginBottom: '10px' }}>
                                        <div style={styles.medicineHeader}>
                                            <div>
                                                <strong>{item.medicineName}</strong> ({item.weight}{item.unit})
                                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                    Prescribed: {item.prescribedQuantity} | Dispensed: {item.dispensedQuantity || 0} | Remaining: {item.remainingQuantity}
                                                    {medicineStock && <span style={{ marginLeft: '8px', color: medicineStock.quantity < 50 ? '#f59e0b' : '#10b981' }}>
                                                        (Stock: {medicineStock.quantity} units)
                                                    </span>}
                                                </div>
                                                {item.dosage && <div>💊 Dosage: {item.dosage}</div>}
                                                {item.frequency && <div>⏰ Frequency: {item.frequency}</div>}
                                                {item.duration && <div>📅 Duration: {item.duration}</div>}
                                                {item.instructions && <div>📝 Instructions: {item.instructions}</div>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {item.remainingQuantity > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setEditingItem(item);
                                                            setEditQuantity(item.prescribedQuantity);
                                                            setEditDosage(item.dosage || '');
                                                            setEditFrequency(item.frequency || '');
                                                            setEditDuration(item.duration || '');
                                                            setEditInstructions(item.instructions || '');
                                                        }}
                                                        style={{ ...styles.editButton, padding: '4px 12px', fontSize: '12px' }}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                )}
                                                {item.dispensedQuantity === 0 && (
                                                    <button
                                                        onClick={() => handleRemoveItem(editPrescriptionData._id, item._id, item.medicineName, item.prescribedQuantity)}
                                                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                                                        disabled={removingItem}
                                                    >
                                                        {removingItem ? 'Removing...' : '🗑️ Remove'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add New Medicine - Live Updates */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                            <h4 style={{ marginBottom: '12px' }}>Add New Medicine</h4>
                            <div style={styles.row}>
                                <select
                                    value={newMedicineItem.medicineId}
                                    onChange={(e) => {
                                        const selected = stock.find(m => m.medicineId === e.target.value);
                                        setNewMedicineItem({ 
                                            ...newMedicineItem, 
                                            medicineId: e.target.value,
                                            maxQuantity: selected?.quantity || 0
                                        });
                                    }}
                                    style={{ flex: 2, ...styles.select }}
                                >
                                    <option value="">Select Medicine</option>
                                    {stock.filter(m => !editPrescriptionData.items.some(i => i.medicineId === m.medicineId)).map(m => (
                                        <option key={m.medicineId} value={m.medicineId}>
                                            {m.medicineName} ({m.weight}{m.unit}) - {m.quantity} units available
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    value={newMedicineItem.quantity}
                                    onChange={(e) => setNewMedicineItem({ ...newMedicineItem, quantity: parseInt(e.target.value) })}
                                    style={{ width: '80px', ...styles.input }}
                                    min="1"
                                    max={newMedicineItem.maxQuantity}
                                />
                                <button
                                    onClick={() => handleAddNewItemToPrescription(editPrescriptionData._id)}
                                    style={styles.submitButton}
                                    disabled={addingItem}
                                >
                                    {addingItem ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                            {newMedicineItem.medicineId && newMedicineItem.quantity > (stock.find(m => m.medicineId === newMedicineItem.medicineId)?.quantity || 0) && (
                                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
                                    Insufficient stock! Only {stock.find(m => m.medicineId === newMedicineItem.medicineId)?.quantity} units available.
                                </div>
                            )}
                        </div>

                        <div style={styles.modalButtons}>
                            <button onClick={() => setShowEditPrescriptionModal(false)} style={styles.cancelButton}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Item Modal */}
            {editingItem && (
                <div style={styles.modalOverlay} onClick={() => setEditingItem(null)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Edit Medicine: {editingItem.medicineName}</h3>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Quantity *</label>
                            <input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={(e) => setEditQuantity(parseInt(e.target.value))}
                                style={styles.input}
                            />
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                Already dispensed: {editingItem.dispensedQuantity || 0} units
                            </div>
                            {editQuantity < (editingItem.dispensedQuantity || 0) && (
                                <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                                    Cannot reduce below already dispensed quantity!
                                </div>
                            )}
                            {editQuantity > editingItem.prescribedQuantity && (
                                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
                                    Additional {editQuantity - editingItem.prescribedQuantity} units will be reserved from stock
                                </div>
                            )}
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Dosage (e.g., 1 tablet)</label>
                            <input type="text" value={editDosage} onChange={(e) => setEditDosage(e.target.value)} style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Frequency (e.g., twice daily)</label>
                            <input type="text" value={editFrequency} onChange={(e) => setEditFrequency(e.target.value)} style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Duration (e.g., 7 days)</label>
                            <input type="text" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} style={styles.input} />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Instructions</label>
                            <textarea rows="2" value={editInstructions} onChange={(e) => setEditInstructions(e.target.value)} style={styles.textarea} />
                        </div>
                        <div style={styles.modalButtons}>
                            <button 
                                onClick={() => handleUpdateItemQuantity(editPrescriptionData._id, editingItem._id, editQuantity)} 
                                style={styles.submitButton}
                                disabled={updatingItem || editQuantity < (editingItem.dispensedQuantity || 0)}
                            >
                                {updatingItem ? 'Updating...' : 'Update'}
                            </button>
                            <button onClick={() => setEditingItem(null)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dispense Modal */}
            {showDispenseModal && (
                <div style={styles.modalOverlay} onClick={() => setShowDispenseModal(false)}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>Dispense Medicine</h3>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Quantity to Dispense *</label>
                            <input
                                type="number"
                                min="1"
                                value={dispenseData.quantity}
                                onChange={(e) => setDispenseData({ ...dispenseData, quantity: parseInt(e.target.value) })}
                                style={styles.input}
                            />
                        </div>
                        <div style={styles.formGroup}>
                            <label style={styles.label}>Notes</label>
                            <input type="text" value={dispenseData.notes} onChange={(e) => setDispenseData({ ...dispenseData, notes: e.target.value })} style={styles.input} placeholder="Optional notes" />
                        </div>
                        <div style={styles.modalButtons}>
                            <button onClick={handleDispenseFromPrescription} style={styles.submitButton}>Confirm Dispense</button>
                            <button onClick={() => setShowDispenseModal(false)} style={styles.cancelButton}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NurseDashboard;