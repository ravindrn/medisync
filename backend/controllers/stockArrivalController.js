const StockArrivalRequest = require('../models/StockArrivalRequest');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const StockUpdateHistory = require('../models/StockUpdateHistory');
const {
    sendStockUpdateNotification,
    sendStockArrivalSubmittedToAdmins,
    sendStockArrivalApprovedToManager,
    sendStockArrivalRejectedToManager
} = require('../services/emailService');

// Helper function to update hospital stats
const updateHospitalStats = async (hospitalId) => {
    try {
        const medicines = await Medicine.find({
            'stocks.hospitalId': hospitalId
        });

        let totalMedicines = 0;
        let totalStock = 0;
        let lowStockCount = 0;

        medicines.forEach(medicine => {
            const stockEntry = medicine.stocks.find(s =>
                s.hospitalId && s.hospitalId.toString() === hospitalId.toString()
            );
            if (stockEntry) {
                totalMedicines++;
                totalStock += stockEntry.availableQuantity;
                if (stockEntry.availableQuantity < 50 && stockEntry.availableQuantity > 0) {
                    lowStockCount++;
                }
            }
        });

        await Hospital.updateOne(
            { _id: hospitalId },
            {
                $set: {
                    "stats.totalMedicines": totalMedicines,
                    "stats.totalStock": totalStock,
                    "stats.lowStockCount": lowStockCount,
                    "stats.lastUpdated": new Date()
                }
            }
        );

        return true;
    } catch (error) {
        console.error('Error updating hospital stats:', error);
        return false;
    }
};

// @desc    Manager sends bulk stock arrival notification
// @route   POST /api/stock-arrivals/bulk-notify
const bulkNotifyStockArrival = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const {
            hospitalId,
            hospitalName,
            hospitalDistrict,
            medicines,
            notes,
            arrivalDate
        } = req.body;

        if (!hospitalId || !hospitalName || !hospitalDistrict) {
            return res.status(400).json({ message: 'Hospital details are required' });
        }

        if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
            return res.status(400).json({ message: 'At least one medicine is required' });
        }

        for (const med of medicines) {
            if (!med.medicineName || !med.medicineName.trim()) {
                return res.status(400).json({ message: 'Medicine name is required for all entries' });
            }
            if (!med.weight || med.weight <= 0) {
                return res.status(400).json({ message: 'Valid strength is required for all medicines' });
            }
            if (!med.quantity || med.quantity <= 0) {
                return res.status(400).json({ message: 'Valid quantity is required for all medicines' });
            }
        }

        const existingHospital = await Hospital.findById(hospitalId);
        if (!existingHospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const stockArrivalRequest = await StockArrivalRequest.create({
            hospitalId,
            hospitalName,
            hospitalDistrict,
            medicines: medicines.map(m => ({
                medicineName: m.medicineName.trim(),
                weight: parseFloat(m.weight),
                unit: m.unit || 'mg',
                quantity: parseInt(m.quantity),
                batchNumber: m.batchNumber || '',
                expiryDate: m.expiryDate || null
            })),
            notes: notes || '',
            arrivalDate: arrivalDate || new Date(),
            requestedBy: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            },
            status: 'pending'
        });

        await sendStockArrivalSubmittedToAdmins(stockArrivalRequest);

        res.status(201).json({
            message: 'Stock arrival notification sent successfully',
            request: stockArrivalRequest,
            medicinesCount: stockArrivalRequest.medicines.length
        });
    } catch (error) {
        console.error('Bulk notify stock arrival error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending stock arrival requests for admin
// @route   GET /api/transfers/stock-requests/pending
const getPendingStockRequests = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const status = req.query.status || 'pending';

        const requests = await StockArrivalRequest.find({ status })
            .sort({ createdAt: -1 });

        const flattenedRequests = [];

        for (const request of requests) {
            for (let index = 0; index < request.medicines.length; index++) {
                const med = request.medicines[index];

                // Find existing medicine record
                const existingMedicine = await Medicine.findOne({
                    medicineName: med.medicineName,
                    weight: med.weight,
                    unit: med.unit
                });

                let currentStock = 0;

                if (existingMedicine) {
                    const existingStock = existingMedicine.stocks.find(stock =>
                        (stock.hospitalId && stock.hospitalId.toString() === request.hospitalId.toString()) ||
                        (stock.hospitalName === request.hospitalName && stock.district === request.hospitalDistrict)
                    );

                    if (existingStock) {
                        currentStock = existingStock.availableQuantity || 0;
                    }
                }

                flattenedRequests.push({
                    _id: `${request._id}-${index}`,
                    parentRequestId: request._id,
                    requestId: request.requestId,
                    hospitalId: request.hospitalId,
                    hospitalName: request.hospitalName,
                    hospitalDistrict: request.hospitalDistrict,
                    requestedBy: request.requestedBy,
                    medicineIndex: index,
                    medicineName: med.medicineName,
                    weight: med.weight,
                    unit: med.unit,
                    requestedQuantity: med.quantity,
                    batchNumber: med.batchNumber,
                    expiryDate: med.expiryDate,
                    currentStock: currentStock,
                    newStockAfterUpdate: currentStock + med.quantity,
                    reason: request.notes,
                    notes: request.notes,
                    status: request.status,
                    createdAt: request.createdAt,
                    adminNotes: request.adminNotes,
                    rejectionReason: request.rejectionReason
                });
            }
        }

        res.json({ requests: flattenedRequests });
    } catch (error) {
        console.error('Get pending stock requests error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve stock arrival request line
// @route   PUT /api/transfers/stock-requests/:id/approve
const approveStockRequest = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { adminNotes } = req.body;
        const compositeId = req.params.id;

        const [requestId, medicineIndexStr] = compositeId.split('-');
        const medicineIndex = parseInt(medicineIndexStr);

        if (!requestId || isNaN(medicineIndex)) {
            return res.status(400).json({ message: 'Invalid stock request ID format' });
        }

        const stockRequest = await StockArrivalRequest.findById(requestId);
        if (!stockRequest) {
            return res.status(404).json({ message: 'Stock arrival request not found' });
        }

        if (stockRequest.status !== 'pending') {
            return res.status(400).json({ message: 'This stock request has already been processed' });
        }

        const medicineRequest = stockRequest.medicines[medicineIndex];
        if (!medicineRequest) {
            return res.status(404).json({ message: 'Requested medicine entry not found' });
        }

        let medicine = await Medicine.findOne({
            medicineName: medicineRequest.medicineName,
            weight: medicineRequest.weight,
            unit: medicineRequest.unit
        });

        let oldQuantity = 0;
        let newQuantity = medicineRequest.quantity;

        if (medicine) {
            const existingStock = medicine.stocks.find(stock =>
                (stock.hospitalId && stock.hospitalId.toString() === stockRequest.hospitalId.toString()) ||
                (stock.hospitalName === stockRequest.hospitalName && stock.district === stockRequest.hospitalDistrict)
            );

            if (existingStock) {
                oldQuantity = existingStock.availableQuantity;
                existingStock.availableQuantity += medicineRequest.quantity;
                existingStock.lastUpdated = new Date();
                existingStock.hospitalId = stockRequest.hospitalId;
                existingStock.hospitalName = stockRequest.hospitalName;
                existingStock.district = stockRequest.hospitalDistrict;
                newQuantity = existingStock.availableQuantity;
            } else {
                medicine.stocks.push({
                    hospitalId: stockRequest.hospitalId,
                    hospitalName: stockRequest.hospitalName,
                    district: stockRequest.hospitalDistrict,
                    availableQuantity: medicineRequest.quantity,
                    lastUpdated: new Date()
                });
                oldQuantity = 0;
                newQuantity = medicineRequest.quantity;
            }

            await medicine.save();
        } else {
            medicine = await Medicine.create({
                medicineName: medicineRequest.medicineName,
                weight: parseFloat(medicineRequest.weight),
                unit: medicineRequest.unit,
                stocks: [{
                    hospitalId: stockRequest.hospitalId,
                    hospitalName: stockRequest.hospitalName,
                    district: stockRequest.hospitalDistrict,
                    availableQuantity: medicineRequest.quantity,
                    lastUpdated: new Date()
                }]
            });

            oldQuantity = 0;
            newQuantity = medicineRequest.quantity;
        }

        await StockUpdateHistory.create({
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            hospitalName: stockRequest.hospitalName,
            district: stockRequest.hospitalDistrict,
            oldQuantity: oldQuantity,
            newQuantity: newQuantity,
            changeAmount: medicineRequest.quantity,
            updatedBy: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            },
            updatedAt: new Date()
        });

        // Send notifications if stock now satisfies user needs
        const usersToNotify = await User.find({
            'watchlist.medicine': medicine._id,
            'watchlist.district': stockRequest.hospitalDistrict,
            'watchlist.notificationRequested': true,
            'watchlist.isNotified': false
        });

        const notificationsSent = [];

        for (const user of usersToNotify) {
            const watchlistItem = user.watchlist.find(item =>
                item.medicine.toString() === medicine._id.toString() &&
                item.district === stockRequest.hospitalDistrict &&
                item.notificationRequested === true &&
                item.isNotified === false
            );

            if (watchlistItem && newQuantity >= watchlistItem.quantityNeeded) {
                try {
                    await sendStockUpdateNotification(
                        user.email,
                        user.name,
                        medicine.medicineName,
                        `${medicine.weight}${medicine.unit}`,
                        stockRequest.hospitalName,
                        stockRequest.hospitalDistrict,
                        newQuantity
                    );

                    watchlistItem.isNotified = true;
                    watchlistItem.notifiedAt = new Date();
                    watchlistItem.notificationRequested = false;
                    await user.save();

                    notificationsSent.push(user.email);
                } catch (emailError) {
                    console.error(`Failed to send email to ${user.email}:`, emailError);
                }
            }
        }

        // Send approval email to related manager
        if (stockRequest.requestedBy?.email) {
            try {
                await sendStockArrivalApprovedToManager(
                    stockRequest.requestedBy.email,
                    stockRequest.requestedBy.name || 'Manager',
                    stockRequest,
                    medicineRequest,
                    req.user,
                    newQuantity
                );
            } catch (managerEmailError) {
                console.error(`Failed to send approval email to manager ${stockRequest.requestedBy.email}:`, managerEmailError);
            }
        }

        // remove only approved medicine line from pending list
        stockRequest.medicines.splice(medicineIndex, 1);

        if (stockRequest.medicines.length === 0) {
            stockRequest.status = 'approved';
            stockRequest.adminNotes = adminNotes || '';
            stockRequest.reviewedBy = {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            };
            stockRequest.reviewedAt = new Date();
        }

        await stockRequest.save();

        await updateHospitalStats(stockRequest.hospitalId);

        res.json({
            message: `Stock request approved successfully. ${notificationsSent.length} notification(s) sent.`,
            medicine,
            notificationsSent: notificationsSent.length
        });
    } catch (error) {
        console.error('Approve stock request error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject stock arrival request line
// @route   PUT /api/transfers/stock-requests/:id/reject
const rejectStockRequest = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { rejectionReason } = req.body;
        const compositeId = req.params.id;

        const [requestId, medicineIndexStr] = compositeId.split('-');
        const medicineIndex = parseInt(medicineIndexStr);

        if (!requestId || isNaN(medicineIndex)) {
            return res.status(400).json({ message: 'Invalid stock request ID format' });
        }

        const stockRequest = await StockArrivalRequest.findById(requestId);
        if (!stockRequest) {
            return res.status(404).json({ message: 'Stock arrival request not found' });
        }

        if (stockRequest.status !== 'pending') {
            return res.status(400).json({ message: 'This stock request has already been processed' });
        }

        const rejectedMedicine = stockRequest.medicines[medicineIndex];
        if (!rejectedMedicine) {
            return res.status(404).json({ message: 'Requested medicine entry not found' });
        }

        // Send rejection email to related manager BEFORE removing the medicine line
        if (stockRequest.requestedBy?.email) {
            try {
                await sendStockArrivalRejectedToManager(
                    stockRequest.requestedBy.email,
                    stockRequest.requestedBy.name || 'Manager',
                    stockRequest,
                    rejectedMedicine,
                    req.user,
                    rejectionReason
                );
            } catch (managerEmailError) {
                console.error(`Failed to send rejection email to manager ${stockRequest.requestedBy.email}:`, managerEmailError);
            }
        }

        stockRequest.medicines.splice(medicineIndex, 1);

        if (stockRequest.medicines.length === 0) {
            stockRequest.status = 'rejected';
            stockRequest.rejectionReason = rejectionReason || 'No reason provided';
            stockRequest.reviewedBy = {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            };
            stockRequest.reviewedAt = new Date();
        }

        await stockRequest.save();

        res.json({
            message: 'Stock request rejected successfully'
        });
    } catch (error) {
        console.error('Reject stock request error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    bulkNotifyStockArrival,
    getPendingStockRequests,
    approveStockRequest,
    rejectStockRequest
};