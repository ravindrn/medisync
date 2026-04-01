const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Prescription = require('../models/Prescription');
const WardActivity = require('../models/WardActivity');

// Helper function to log ward activity
const logWardActivity = async (data) => {
    try {
        await WardActivity.create(data);
    } catch (error) {
        console.error('Failed to log ward activity:', error);
    }
};

// @desc    Get hospital stock for nurse's hospital
// @route   GET /api/nurse/stock
const getHospitalStock = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const user = await User.findById(req.user.id);
        
        const hospital = await Hospital.findById(user.hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const medicines = await Medicine.find({
            'stocks.hospitalId': hospital._id
        }).sort({ medicineName: 1 });

        const stock = [];
        let totalItems = 0;
        let totalQuantity = 0;
        let lowStockCount = 0;

        for (const medicine of medicines) {
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );
            
            if (stockEntry && stockEntry.availableQuantity > 0) {
                const quantity = stockEntry.availableQuantity;
                totalItems++;
                totalQuantity += quantity;
                if (quantity < 50) lowStockCount++;
                
                stock.push({
                    medicineId: medicine._id,
                    medicineName: medicine.medicineName,
                    weight: medicine.weight,
                    unit: medicine.unit,
                    quantity: quantity,
                    status: quantity === 0 ? 'Out of Stock' : 
                            quantity < 10 ? 'Critical' : 
                            quantity < 50 ? 'Low Stock' : 'Available',
                    lastUpdated: stockEntry.lastUpdated
                });
            }
        }

        const alerts = stock.filter(item => item.quantity < 50).map(item => ({
            medicineName: item.medicineName,
            currentStock: item.quantity,
            status: item.status
        }));

        res.json({
            hospital: {
                id: hospital._id,
                name: hospital.name,
                district: hospital.district,
                ward: user.ward || 'General Ward',
                wardNumber: user.wardNumber || ''
            },
            stock: stock,
            alerts: alerts,
            totalItems: totalItems,
            totalQuantity: totalQuantity,
            lowStockCount: lowStockCount
        });
    } catch (error) {
        console.error('Get hospital stock error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Dispense medicine (reduce hospital stock)
// @route   POST /api/nurse/dispense
const dispenseMedicine = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { medicineId, quantity, patientId, notes } = req.body;
        
        if (!medicineId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Invalid medicine or quantity' });
        }

        const user = await User.findById(req.user.id);
        const hospital = await Hospital.findById(user.hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const medicine = await Medicine.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const stockIndex = medicine.stocks.findIndex(s => 
            s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
        );

        if (stockIndex === -1) {
            return res.status(404).json({ message: 'Medicine not found in hospital stock' });
        }

        if (medicine.stocks[stockIndex].availableQuantity < quantity) {
            return res.status(400).json({ 
                message: `Insufficient stock. Only ${medicine.stocks[stockIndex].availableQuantity} units available` 
            });
        }

        const previousStock = medicine.stocks[stockIndex].availableQuantity;
        
        medicine.stocks[stockIndex].availableQuantity -= quantity;
        medicine.stocks[stockIndex].lastUpdated = new Date();
        
        const newQuantity = medicine.stocks[stockIndex].availableQuantity;
        medicine.stocks[stockIndex].status = newQuantity === 0 ? 'Out of Stock' : 
                                              newQuantity < 10 ? 'Critical' : 
                                              newQuantity < 50 ? 'Low Stock' : 'Available';

        await medicine.save();

        // Log ward activity
        await logWardActivity({
            hospitalId: hospital._id,
            wardName: user.ward,
            wardNumber: user.wardNumber,
            activityType: 'dispense',
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            quantity: quantity,
            previousStock: previousStock,
            newStock: medicine.stocks[stockIndex].availableQuantity,
            patientId: patientId,
            nurseId: user._id,
            nurseName: user.name,
            notes: notes
        });

        console.log(`✅ Medicine dispensed: ${medicine.medicineName} x${quantity} from ${hospital.name} by ${user.name} (${user.ward} ward)`);

        res.json({
            message: 'Medicine dispensed successfully',
            medicine: {
                id: medicine._id,
                name: medicine.medicineName,
                dispensedQuantity: quantity,
                remainingQuantity: medicine.stocks[stockIndex].availableQuantity
            }
        });
    } catch (error) {
        console.error('Dispense medicine error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get medicines with low stock alerts
// @route   GET /api/nurse/alerts
const getLowStockAlerts = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const user = await User.findById(req.user.id);
        const hospital = await Hospital.findById(user.hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const medicines = await Medicine.find({
            'stocks.hospitalId': hospital._id,
            'stocks.availableQuantity': { $lt: 50 }
        }).sort({ medicineName: 1 });

        const alerts = medicines.map(medicine => {
            const stock = medicine.stocks.find(s => 
                s.hospitalId.toString() === hospital._id.toString()
            );
            return {
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                currentStock: stock.availableQuantity,
                status: stock.availableQuantity < 10 ? 'Critical' : 'Low Stock'
            };
        });

        res.json({
            hospital: hospital.name,
            alerts: alerts,
            totalAlerts: alerts.length
        });
    } catch (error) {
        console.error('Get low stock alerts error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search medicines in hospital stock
// @route   GET /api/nurse/search
const searchMedicines = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { query } = req.query;
        const user = await User.findById(req.user.id);
        const hospital = await Hospital.findById(user.hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        let searchQuery = {};
        if (query) {
            searchQuery.medicineName = { $regex: query, $options: 'i' };
        }

        const medicines = await Medicine.find({
            ...searchQuery,
            'stocks.hospitalId': hospital._id,
            'stocks.availableQuantity': { $gt: 0 }
        }).sort({ medicineName: 1 });

        const results = medicines.map(medicine => {
            const stock = medicine.stocks.find(s => 
                s.hospitalId.toString() === hospital._id.toString()
            );
            return {
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                quantity: stock.availableQuantity,
                status: stock.availableQuantity < 10 ? 'Critical' : 
                        stock.availableQuantity < 50 ? 'Low Stock' : 'Available'
            };
        });

        res.json({
            results,
            total: results.length
        });
    } catch (error) {
        console.error('Search medicines error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ==================== PRESCRIPTION FUNCTIONS ====================

// @desc    Create a new prescription
// @route   POST /api/nurse/prescription
const createPrescription = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const {
            patientId,
            patientName,
            patientAge,
            patientGender,
            doctorName,
            items,
            notes
        } = req.body;

        if (!patientId || !patientName || !items || items.length === 0) {
            return res.status(400).json({ message: 'Patient ID, name, and at least one medicine are required' });
        }

        const user = await User.findById(req.user.id);
        const hospital = await Hospital.findById(user.hospitalId);

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const validatedItems = [];
        for (const item of items) {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) {
                return res.status(404).json({ message: `Medicine not found: ${item.medicineId}` });
            }

            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );

            if (!stockEntry) {
                return res.status(400).json({ 
                    message: `${medicine.medicineName} is not available in this hospital` 
                });
            }

            if (stockEntry.availableQuantity < item.quantity) {
                return res.status(400).json({ 
                    message: `Insufficient stock for ${medicine.medicineName}. Available: ${stockEntry.availableQuantity}` 
                });
            }

            validatedItems.push({
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                prescribedQuantity: item.quantity,
                remainingQuantity: item.quantity,
                dosage: item.dosage || '',
                frequency: item.frequency || '',
                duration: item.duration || '',
                instructions: item.instructions || '',
                status: 'pending'
            });
        }

        const prescription = await Prescription.create({
            patientId,
            patientName,
            patientAge: patientAge ? parseInt(patientAge) : null,
            patientGender,
            doctorName: doctorName || '',
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            ward: user.ward || 'General Ward',
            nurseId: user._id,
            nurseName: user.name,
            items: validatedItems,
            notes: notes || '',
            status: 'active'
        });

        res.status(201).json({
            message: 'Prescription created successfully',
            prescription
        });
    } catch (error) {
        console.error('Create prescription error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get prescriptions for a patient
// @route   GET /api/nurse/prescriptions/patient/:patientId
const getPatientPrescriptions = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { patientId } = req.params;
        const user = await User.findById(req.user.id);

        const prescriptions = await Prescription.find({
            hospitalId: user.hospitalId,
            patientId: patientId
        }).sort({ createdAt: -1 });

        res.json({
            prescriptions,
            total: prescriptions.length
        });
    } catch (error) {
        console.error('Get patient prescriptions error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all active prescriptions for current ward/hospital
// @route   GET /api/nurse/prescriptions/active
const getActivePrescriptions = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const user = await User.findById(req.user.id);

        const prescriptions = await Prescription.find({
            hospitalId: user.hospitalId,
            status: { $in: ['active', 'partial'] }
        }).sort({ createdAt: -1 });

        res.json({
            prescriptions,
            total: prescriptions.length
        });
    } catch (error) {
        console.error('Get active prescriptions error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get prescription history
// @route   GET /api/nurse/prescriptions/history
const getPrescriptionHistory = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const user = await User.findById(req.user.id);
        const { status, patientId, startDate, endDate, page = 1, limit = 20 } = req.query;
        
        const query = {
            hospitalId: user.hospitalId
        };

        if (status && status !== 'all') {
            query.status = status;
        }

        if (patientId) {
            query.patientId = { $regex: patientId, $options: 'i' };
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [prescriptions, total] = await Promise.all([
            Prescription.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Prescription.countDocuments(query)
        ]);

        const stats = {
            total: total,
            active: await Prescription.countDocuments({ ...query, status: 'active' }),
            partial: await Prescription.countDocuments({ ...query, status: 'partial' }),
            completed: await Prescription.countDocuments({ ...query, status: 'completed' }),
            cancelled: await Prescription.countDocuments({ ...query, status: 'cancelled' })
        };

        res.json({
            prescriptions,
            stats,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get prescription history error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get prescription details
// @route   GET /api/nurse/prescription/:id
const getPrescriptionDetails = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { id } = req.params;
        const user = await User.findById(req.user.id);

        const prescription = await Prescription.findOne({
            _id: id,
            hospitalId: user.hospitalId
        });

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        res.json(prescription);
    } catch (error) {
        console.error('Get prescription details error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get prescription for editing
// @route   GET /api/nurse/prescription/:id/edit
const getPrescriptionForEdit = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { id } = req.params;
        const user = await User.findById(req.user.id);

        const prescription = await Prescription.findOne({
            _id: id,
            hospitalId: user.hospitalId,
            status: { $in: ['active', 'partial'] }
        });

        if (!prescription) {
            return res.status(404).json({ 
                message: 'Prescription not found or cannot be edited (only active/partial prescriptions can be edited)' 
            });
        }

        res.json(prescription);
    } catch (error) {
        console.error('Get prescription for edit error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Dispense from prescription
// @route   POST /api/nurse/prescription/dispense
const dispenseFromPrescription = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { prescriptionId, medicineId, quantity, notes } = req.body;

        if (!prescriptionId || !medicineId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Prescription ID, medicine ID, and quantity are required' });
        }

        const user = await User.findById(req.user.id);
        const hospital = await Hospital.findById(user.hospitalId);

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        if (prescription.hospitalId.toString() !== hospital._id.toString()) {
            return res.status(403).json({ message: 'Access denied. Prescription not from your hospital' });
        }

        const itemIndex = prescription.items.findIndex(item => 
            item.medicineId.toString() === medicineId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Medicine not found in prescription' });
        }

        const item = prescription.items[itemIndex];

        if (item.remainingQuantity < quantity) {
            return res.status(400).json({ 
                message: `Only ${item.remainingQuantity} units remaining for ${item.medicineName}` 
            });
        }

        const medicine = await Medicine.findById(medicineId);
        const stockIndex = medicine.stocks.findIndex(s => 
            s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
        );

        if (stockIndex === -1) {
            return res.status(404).json({ message: 'Medicine not found in hospital stock' });
        }

        if (medicine.stocks[stockIndex].availableQuantity < quantity) {
            return res.status(400).json({ 
                message: `Insufficient hospital stock. Only ${medicine.stocks[stockIndex].availableQuantity} units available` 
            });
        }

        const previousStock = medicine.stocks[stockIndex].availableQuantity;
        
        medicine.stocks[stockIndex].availableQuantity -= quantity;
        medicine.stocks[stockIndex].lastUpdated = new Date();
        
        const newStock = medicine.stocks[stockIndex].availableQuantity;
        medicine.stocks[stockIndex].status = newStock === 0 ? 'Out of Stock' : 
                                              newStock < 10 ? 'Critical' : 
                                              newStock < 50 ? 'Low Stock' : 'Available';
        await medicine.save();

        item.dispensedQuantity = (item.dispensedQuantity || 0) + quantity;
        item.remainingQuantity -= quantity;
        
        if (item.remainingQuantity === 0) {
            item.status = 'completed';
        } else if (item.dispensedQuantity > 0) {
            item.status = 'partial';
        }

        const allCompleted = prescription.items.every(i => i.remainingQuantity === 0);
        const anyDispensed = prescription.items.some(i => i.dispensedQuantity > 0);

        if (allCompleted) {
            prescription.status = 'completed';
            prescription.completedAt = new Date();
        } else if (anyDispensed) {
            prescription.status = 'partial';
        }

        prescription.updatedAt = new Date();
        await prescription.save();

        // Log ward activity
        await logWardActivity({
            hospitalId: hospital._id,
            wardName: user.ward,
            wardNumber: user.wardNumber,
            activityType: 'dispense',
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            quantity: quantity,
            previousStock: previousStock,
            newStock: medicine.stocks[stockIndex].availableQuantity,
            patientId: prescription.patientId,
            patientName: prescription.patientName,
            nurseId: user._id,
            nurseName: user.name,
            prescriptionId: prescription._id,
            notes: notes || `Dispensed from prescription ${prescription.prescriptionId}`
        });

        res.json({
            message: 'Medicine dispensed successfully',
            prescription: {
                id: prescription._id,
                prescriptionId: prescription.prescriptionId,
                patientName: prescription.patientName
            },
            medicine: {
                name: item.medicineName,
                dispensedQuantity: quantity,
                remainingPrescription: item.remainingQuantity,
                hospitalStockRemaining: medicine.stocks[stockIndex].availableQuantity
            }
        });
    } catch (error) {
        console.error('Dispense from prescription error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel prescription
// @route   PUT /api/nurse/prescription/:id/cancel
const cancelPrescription = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { id } = req.params;
        const { reason } = req.body;
        const user = await User.findById(req.user.id);

        const prescription = await Prescription.findOne({
            _id: id,
            hospitalId: user.hospitalId
        });

        if (!prescription) {
            return res.status(404).json({ message: 'Prescription not found' });
        }

        prescription.status = 'cancelled';
        prescription.cancelledAt = new Date();
        prescription.cancelledReason = reason || 'Cancelled by nurse';
        prescription.updatedAt = new Date();

        await prescription.save();

        res.json({
            message: 'Prescription cancelled successfully',
            prescription
        });
    } catch (error) {
        console.error('Cancel prescription error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add item to prescription
// @route   POST /api/nurse/prescription/:id/add-item
const addPrescriptionItem = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { id } = req.params;
        const { medicineId, quantity, dosage, frequency, duration, instructions } = req.body;
        const user = await User.findById(req.user.id);

        if (!medicineId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Medicine ID and quantity are required' });
        }

        const prescription = await Prescription.findOne({
            _id: id,
            hospitalId: user.hospitalId,
            status: { $in: ['active', 'partial'] }
        });

        if (!prescription) {
            return res.status(404).json({ 
                message: 'Prescription not found or cannot be modified' 
            });
        }

        const existingItem = prescription.items.find(
            item => item.medicineId.toString() === medicineId
        );

        if (existingItem) {
            return res.status(400).json({ 
                message: 'Medicine already exists in prescription. Use update to change quantity.' 
            });
        }

        const hospital = await Hospital.findById(user.hospitalId);
        const medicine = await Medicine.findById(medicineId);
        
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const stockEntry = medicine.stocks.find(s => 
            s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
        );

        if (!stockEntry || stockEntry.availableQuantity < quantity) {
            return res.status(400).json({ 
                message: `Insufficient stock. Only ${stockEntry?.availableQuantity || 0} units available` 
            });
        }

        const previousStock = stockEntry.availableQuantity;
        
        // Reserve stock (deduct from hospital)
        stockEntry.availableQuantity -= quantity;
        stockEntry.lastUpdated = new Date();
        await medicine.save();

        // Add to prescription
        prescription.items.push({
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            prescribedQuantity: quantity,
            remainingQuantity: quantity,
            dosage: dosage || '',
            frequency: frequency || '',
            duration: duration || '',
            instructions: instructions || '',
            status: 'pending'
        });

        if (prescription.status === 'completed') {
            prescription.status = 'partial';
        }

        prescription.updatedAt = new Date();
        await prescription.save();

        // Log ward activity
        await logWardActivity({
            hospitalId: hospital._id,
            wardName: user.ward,
            wardNumber: user.wardNumber,
            activityType: 'stock_adjustment',
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            quantity: quantity,
            previousStock: previousStock,
            newStock: stockEntry.availableQuantity,
            nurseId: user._id,
            nurseName: user.name,
            prescriptionId: prescription._id,
            notes: `Added to prescription ${prescription.prescriptionId}`
        });

        res.json({
            message: 'Medicine added to prescription successfully',
            prescription: {
                id: prescription._id,
                prescriptionId: prescription.prescriptionId,
                addedItem: {
                    medicineName: medicine.medicineName,
                    quantity: quantity
                }
            }
        });
    } catch (error) {
        console.error('Add prescription item error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update prescription item
// @route   PUT /api/nurse/prescription/:id/update-item/:itemId
const updatePrescriptionItem = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { id, itemId } = req.params;
        const { quantity, dosage, frequency, duration, instructions } = req.body;
        const user = await User.findById(req.user.id);

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }

        const prescription = await Prescription.findOne({
            _id: id,
            hospitalId: user.hospitalId,
            status: { $in: ['active', 'partial'] }
        });

        if (!prescription) {
            return res.status(404).json({ 
                message: 'Prescription not found or cannot be modified' 
            });
        }

        const itemIndex = prescription.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in prescription' });
        }

        const item = prescription.items[itemIndex];
        const oldQuantity = item.prescribedQuantity;

        if (quantity < oldQuantity) {
            const dispensedAlready = item.dispensedQuantity || 0;
            if (dispensedAlready > quantity) {
                return res.status(400).json({ 
                    message: `Cannot reduce quantity below already dispensed amount (${dispensedAlready} units already dispensed)` 
                });
            }
        }

        const hospital = await Hospital.findById(user.hospitalId);
        const medicine = await Medicine.findById(item.medicineId);
        let previousStock = null;

        if (quantity > oldQuantity) {
            const additionalNeeded = quantity - oldQuantity;
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );

            if (!stockEntry || stockEntry.availableQuantity < additionalNeeded) {
                return res.status(400).json({ 
                    message: `Insufficient stock. Only ${stockEntry?.availableQuantity || 0} units available for additional ${additionalNeeded} units` 
                });
            }
            
            previousStock = stockEntry.availableQuantity;
            stockEntry.availableQuantity -= additionalNeeded;
            stockEntry.lastUpdated = new Date();
            await medicine.save();
        } else if (quantity < oldQuantity) {
            // Return excess stock to hospital
            const excess = oldQuantity - quantity;
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );
            
            if (stockEntry) {
                previousStock = stockEntry.availableQuantity;
                stockEntry.availableQuantity += excess;
                stockEntry.lastUpdated = new Date();
                await medicine.save();
            }
        }

        item.prescribedQuantity = quantity;
        item.remainingQuantity = quantity - (item.dispensedQuantity || 0);
        if (dosage) item.dosage = dosage;
        if (frequency) item.frequency = frequency;
        if (duration) item.duration = duration;
        if (instructions) item.instructions = instructions;

        prescription.updatedAt = new Date();
        await prescription.save();

        res.json({
            message: 'Prescription item updated successfully',
            item: {
                medicineName: item.medicineName,
                oldQuantity: oldQuantity,
                newQuantity: quantity,
                remainingQuantity: item.remainingQuantity
            }
        });
    } catch (error) {
        console.error('Update prescription item error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove item from prescription
// @route   DELETE /api/nurse/prescription/:id/remove-item/:itemId
const removePrescriptionItem = async (req, res) => {
    try {
        if (req.user.role !== 'nurse') {
            return res.status(403).json({ message: 'Access denied. Nurse only.' });
        }

        const { id, itemId } = req.params;
        const user = await User.findById(req.user.id);

        const prescription = await Prescription.findOne({
            _id: id,
            hospitalId: user.hospitalId,
            status: { $in: ['active', 'partial'] }
        });

        if (!prescription) {
            return res.status(404).json({ 
                message: 'Prescription not found or cannot be modified' 
            });
        }

        const itemIndex = prescription.items.findIndex(
            item => item._id.toString() === itemId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in prescription' });
        }

        const item = prescription.items[itemIndex];
        
        if ((item.dispensedQuantity || 0) > 0) {
            return res.status(400).json({ 
                message: `Cannot remove ${item.medicineName} because ${item.dispensedQuantity} units have already been dispensed.` 
            });
        }

        // Return stock to hospital
        const hospital = await Hospital.findById(user.hospitalId);
        const medicine = await Medicine.findById(item.medicineId);
        
        if (medicine) {
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );
            
            if (stockEntry) {
                stockEntry.availableQuantity += item.prescribedQuantity;
                stockEntry.lastUpdated = new Date();
                await medicine.save();
            }
        }

        prescription.items.splice(itemIndex, 1);

        if (prescription.items.length === 0) {
            prescription.status = 'cancelled';
            prescription.cancelledAt = new Date();
            prescription.cancelledReason = 'All medicines removed from prescription';
        }

        prescription.updatedAt = new Date();
        await prescription.save();

        res.json({
            message: `Removed ${item.medicineName} from prescription`,
            prescription: {
                id: prescription._id,
                prescriptionId: prescription.prescriptionId,
                remainingItems: prescription.items.length
            }
        });
    } catch (error) {
        console.error('Remove prescription item error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Export all functions
module.exports = {
    getHospitalStock,
    dispenseMedicine,
    getLowStockAlerts,
    searchMedicines,
    createPrescription,
    getPatientPrescriptions,
    getActivePrescriptions,
    dispenseFromPrescription,
    getPrescriptionDetails,
    cancelPrescription,
    getPrescriptionHistory,
    getPrescriptionForEdit,
    addPrescriptionItem,
    updatePrescriptionItem,
    removePrescriptionItem
};