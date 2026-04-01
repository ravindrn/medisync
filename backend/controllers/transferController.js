const fs = require('fs');
const Transfer = require('../models/Transfer');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const TransferHistory = require('../models/TransferHistory');
const { 
    sendStockUpdateNotification,
    sendTransferRequestEmail,
    sendTransferApprovedEmail,
    sendTransferCompletedEmail,
    sendTransferRejectedEmail 
} = require('../services/emailService');
const { generateTransferDocument, generateRejectionDocument } = require('../services/pdfService');

const WardActivity = require('../models/WardActivity');


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
        
        console.log(`📊 Updated stats for hospital: ${totalMedicines} medicines, ${totalStock} units`);
        return true;
    } catch (error) {
        console.error('Error updating hospital stats:', error);
        return false;
    }
};

// Helper function to log transfer history
const logTransferHistory = async (transfer, action, userId, user) => {
    try {
        for (const medicine of transfer.medicines) {
            if (medicine.status === 'approved' && medicine.approvedQuantity > 0) {
                const isCompleted = transfer.status === 'completed';
                
                const historyEntry = {
                    transferId: transfer._id,
                    requestId: transfer.requestId,
                    type: action === 'approve' ? 'sent' : 'received',
                    medicineId: medicine.medicineId,
                    medicineName: medicine.medicineName,
                    weight: medicine.weight,
                    unit: medicine.unit,
                    fromHospital: transfer.fromHospital,
                    toHospital: transfer.toHospital,
                    quantity: medicine.approvedQuantity,
                    status: isCompleted ? 'completed' : 'approved',
                    completedAt: isCompleted ? new Date() : null
                };
                
                if (action === 'approve') {
                    historyEntry.approvedBy = {
                        id: userId,
                        name: user.name,
                        email: user.email
                    };
                } else if (action === 'confirm') {
                    historyEntry.confirmedBy = {
                        id: userId,
                        name: user.name,
                        email: user.email
                    };
                    // When confirming, update both sent and received entries to completed
                    await TransferHistory.updateMany(
                        { transferId: transfer._id, medicineId: medicine.medicineId },
                        { 
                            $set: { 
                                status: 'completed',
                                completedAt: new Date()
                            } 
                        }
                    );
                }
                
                // Only create new entry if it doesn't exist
                const existing = await TransferHistory.findOne({
                    transferId: transfer._id,
                    medicineId: medicine.medicineId,
                    type: historyEntry.type
                });
                
                if (!existing) {
                    await TransferHistory.create(historyEntry);
                }
            }
        }
    } catch (error) {
        console.error('Error logging transfer history:', error);
    }
};

// @desc    Create transfer request
// @route   POST /api/transfers/request
const createTransferRequest = async (req, res) => {
    try {
        const { toHospitalId, medicines, notes } = req.body;
        const userId = req.user.id;
        
        const user = await User.findById(userId);
        const fromHospital = await Hospital.findOne({ manager: userId });
        
        if (!fromHospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }
        
        const toHospital = await Hospital.findById(toHospitalId);
        if (!toHospital) {
            return res.status(404).json({ message: 'Destination hospital not found' });
        }
        
        // Check stock availability in DESTINATION hospital
        const medicineDetails = [];
        for (const item of medicines) {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) {
                return res.status(404).json({ message: `Medicine not found` });
            }
            
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === toHospital._id.toString()
            );
            
            const availableQuantity = stockEntry?.availableQuantity || 0;
            
            if (availableQuantity < item.requestedQuantity) {
                return res.status(400).json({ 
                    message: `Insufficient stock for ${medicine.medicineName} at ${toHospital.name}. Available: ${availableQuantity}` 
                });
            }
            
            medicineDetails.push({
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                requestedQuantity: item.requestedQuantity,
                status: 'pending'
            });
        }
        
        const transfer = await Transfer.create({
            fromHospital: {
                id: fromHospital._id,
                name: fromHospital.name,
                district: fromHospital.district
            },
            toHospital: {
                id: toHospital._id,
                name: toHospital.name,
                district: toHospital.district
            },
            medicines: medicineDetails,
            requestedBy: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            notes
        });
        
        // Send email notification to the destination hospital manager
        const toHospitalManager = await User.findById(toHospital.manager);
        if (toHospitalManager) {
            await sendTransferRequestEmail(
                toHospitalManager,
                fromHospital,
                toHospital,
                medicineDetails,
                transfer.requestId
            );
        }
        
        res.status(201).json({
            message: 'Transfer request created successfully. Notification sent to the hospital manager.',
            transfer
        });
    } catch (error) {
        console.error('Create transfer error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending requests for a hospital
// @route   GET /api/transfers/pending
const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const hospital = await Hospital.findOne({ manager: userId });
        
        if (!hospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }
        
        const pendingRequests = await Transfer.find({
            'toHospital.id': hospital._id,
            status: 'pending'
        }).sort({ createdAt: -1 });
        
        res.json(pendingRequests);
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve transfer request
// @route   PUT /api/transfers/:id/approve
const approveTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedQuantities } = req.body;
        const userId = req.user.id;
        
        const transfer = await Transfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }
        
        const hospital = await Hospital.findOne({ manager: userId });
        if (!hospital || transfer.toHospital.id.toString() !== hospital._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to approve this request' });
        }
        
        // Update approved quantities and deduct from stock
        for (let i = 0; i < transfer.medicines.length; i++) {
            const medicine = transfer.medicines[i];
            const approvedQty = approvedQuantities?.[i] || medicine.requestedQuantity;
            
            if (approvedQty > 0) {
                const medicineDoc = await Medicine.findById(medicine.medicineId);
                const stockEntry = medicineDoc.stocks.find(s => 
                    s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
                );
                
                if (!stockEntry || stockEntry.availableQuantity < approvedQty) {
                    return res.status(400).json({ 
                        message: `Insufficient stock for ${medicine.medicineName}. Available: ${stockEntry?.availableQuantity || 0}` 
                    });
                }
                
                stockEntry.availableQuantity -= approvedQty;
                stockEntry.lastUpdated = new Date();
                await medicineDoc.save();
                
                medicine.approvedQuantity = approvedQty;
                medicine.status = 'approved';
            } else {
                medicine.status = 'rejected';
            }
        }
        
        transfer.status = 'approved';
        transfer.approvedBy = {
            id: userId,
            name: req.user.name,
            email: req.user.email
        };
        transfer.updatedAt = new Date();
        
        await transfer.save();
        
        // Log transfer history
        await logTransferHistory(transfer, 'approve', userId, req.user);
        
        // Send email notification to the requesting hospital manager
        const requestingHospitalManager = await User.findById(transfer.requestedBy.id);
        if (requestingHospitalManager) {
            await sendTransferApprovedEmail(
                requestingHospitalManager,
                transfer.fromHospital,
                transfer.toHospital,
                transfer.medicines.filter(m => m.status === 'approved'),
                transfer.requestId
            );
        }
        
        // Update hospital stats
        await updateHospitalStats(hospital._id);
        
        res.json({
            message: 'Transfer request approved successfully. Notification sent to the requesting hospital.',
            transfer
        });
    } catch (error) {
        console.error('Approve transfer error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject transfer request
// @route   PUT /api/transfers/:id/reject
const rejectTransfer = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;
        
        const transfer = await Transfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }
        
        const hospital = await Hospital.findOne({ manager: userId });
        if (!hospital || transfer.toHospital.id.toString() !== hospital._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to reject this request' });
        }
        
        transfer.status = 'rejected';
        transfer.rejectionReason = reason || 'No reason provided';
        transfer.updatedAt = new Date();
        
        await transfer.save();
        
        // Send email notification to the requesting hospital manager
        const requestingHospitalManager = await User.findById(transfer.requestedBy.id);
        if (requestingHospitalManager) {
            await sendTransferRejectedEmail(
                requestingHospitalManager,
                transfer.fromHospital,
                transfer.toHospital,
                reason,
                transfer.requestId
            );
        }
        
        res.json({
            message: 'Transfer request rejected. Notification sent to the requesting hospital.',
            transfer
        });
    } catch (error) {
        console.error('Reject transfer error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Confirm receipt of transfer
// @route   PUT /api/transfers/:id/confirm
const confirmReceipt = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        console.log('\n=== CONFIRM RECEIPT STARTED ===');
        console.log('Transfer ID:', id);
        console.log('User ID:', userId);
        
        const transfer = await Transfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }
        
        console.log('Transfer found:', transfer.requestId);
        console.log('From Hospital:', transfer.fromHospital.name);
        console.log('To Hospital:', transfer.toHospital.name);
        console.log('Transfer Status:', transfer.status);
        
        const hospital = await Hospital.findOne({ manager: userId });
        if (!hospital || transfer.fromHospital.id.toString() !== hospital._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to confirm this transfer' });
        }
        
        console.log('Hospital confirming:', hospital.name);
        console.log('Receiving District:', hospital.district);
        
        if (transfer.status !== 'approved') {
            return res.status(400).json({ message: 'Transfer must be approved before confirming receipt' });
        }
        
        // Add received stock to hospital and send user notifications
        const userNotificationsSent = [];
        
        for (const medicine of transfer.medicines) {
            if (medicine.status === 'approved' && medicine.approvedQuantity > 0) {
                console.log(`\n📦 Processing: ${medicine.medicineName} - ${medicine.approvedQuantity} units`);
                
                const medicineDoc = await Medicine.findById(medicine.medicineId);
                
                // Find existing stock for the receiving hospital
                const existingStockIndex = medicineDoc.stocks.findIndex(s => 
                    s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
                );
                
                let newHospitalStock;
                if (existingStockIndex !== -1) {
                    newHospitalStock = medicineDoc.stocks[existingStockIndex].availableQuantity + medicine.approvedQuantity;
                    medicineDoc.stocks[existingStockIndex].availableQuantity += medicine.approvedQuantity;
                    medicineDoc.stocks[existingStockIndex].lastUpdated = new Date();
                    console.log(`   Updated hospital stock: ${newHospitalStock} units`);
                } else {
                    newHospitalStock = medicine.approvedQuantity;
                    medicineDoc.stocks.push({
                        hospitalId: hospital._id,
                        hospitalName: hospital.name,
                        district: hospital.district,
                        availableQuantity: medicine.approvedQuantity,
                        lastUpdated: new Date()
                    });
                    console.log(`   Created new hospital stock: ${newHospitalStock} units`);
                }
                
                await medicineDoc.save();
                
                // CALCULATE TOTAL STOCK IN THE DISTRICT (not just this hospital)
                console.log(`\n🔔 Calculating total ${medicine.medicineName} in ${hospital.district} district`);
                
                // Find ALL stocks in this district for this medicine
                const allStocksInDistrict = medicineDoc.stocks.filter(stock => 
                    stock.district === hospital.district
                );
                
                const totalDistrictStock = allStocksInDistrict.reduce((sum, stock) => sum + stock.availableQuantity, 0);
                
                console.log(`   Total ${medicine.medicineName} in ${hospital.district}: ${totalDistrictStock} units`);
                console.log(`   Hospital stock: ${newHospitalStock} units`);
                console.log(`   Other hospitals in district: ${totalDistrictStock - newHospitalStock} units`);
                
                // Find users who requested this medicine in this district
                const usersToNotify = await User.find({
                    'watchlist.medicine': medicine.medicineId,
                    'watchlist.district': hospital.district,
                    'watchlist.notificationRequested': true,
                    'watchlist.isNotified': false
                });
                
                console.log(`   Found ${usersToNotify.length} users to check`);
                
                for (const user of usersToNotify) {
                    const watchlistItem = user.watchlist.find(item => 
                        item.medicine.toString() === medicine.medicineId.toString() && 
                        item.district === hospital.district
                    );
                    
                    if (watchlistItem) {
                        console.log(`   User: ${user.email} - Needs: ${watchlistItem.quantityNeeded} units`);
                        console.log(`   Total district stock: ${totalDistrictStock} units`);
                        
                        // Check if TOTAL DISTRICT stock meets user's need
                        if (totalDistrictStock >= watchlistItem.quantityNeeded) {
                            console.log(`   ✅ User qualifies for notification!`);
                            try {
                                await sendStockUpdateNotification(
                                    user.email,
                                    user.name,
                                    medicine.medicineName,
                                    `${medicine.weight}${medicine.unit}`,
                                    hospital.name,
                                    hospital.district,
                                    totalDistrictStock
                                );
                                
                                // Mark as notified
                                watchlistItem.isNotified = true;
                                watchlistItem.notifiedAt = new Date();
                                watchlistItem.notificationRequested = false;
                                await user.save();
                                
                                userNotificationsSent.push(user.email);
                                console.log(`   📧 Email sent to ${user.email}`);
                            } catch (emailError) {
                                console.error(`   ❌ Failed to send email to ${user.email}:`, emailError);
                            }
                        } else {
                            console.log(`   ⏳ User not notified yet (needs ${watchlistItem.quantityNeeded - totalDistrictStock} more units)`);
                        }
                    }
                }
            }
        }
        
        transfer.status = 'completed';
        transfer.receivedAt = new Date();
        transfer.completedAt = new Date();
        transfer.updatedAt = new Date();
        
        await transfer.save();
        
        // Update history
        await TransferHistory.updateMany(
            { transferId: transfer._id },
            { 
                $set: { 
                    status: 'completed',
                    completedAt: new Date()
                } 
            }
        );
        
        // Send email notification to the sending hospital manager
        console.log('\n=== SENDING TRANSFER COMPLETED EMAIL ===');
        console.log('Sending hospital ID from transfer:', transfer.toHospital.id);
        
        // Find the sending hospital
        const sendingHospital = await Hospital.findById(transfer.toHospital.id);
        if (sendingHospital) {
            console.log('Sending hospital found:', sendingHospital.name);
            console.log('Sending hospital manager ID:', sendingHospital.manager);
            
            if (sendingHospital.manager) {
                const sendingHospitalManager = await User.findById(sendingHospital.manager);
                if (sendingHospitalManager) {
                    console.log('Sending hospital manager email:', sendingHospitalManager.email);
                    console.log('Sending hospital manager name:', sendingHospitalManager.name);
                    
                    const approvedMedicines = transfer.medicines.filter(m => m.status === 'approved');
                    console.log('Approved medicines count:', approvedMedicines.length);
                    
                    try {
                        const emailResult = await sendTransferCompletedEmail(
                            sendingHospitalManager,
                            transfer.fromHospital,
                            transfer.toHospital,
                            approvedMedicines,
                            transfer.requestId
                        );
                        
                        if (emailResult.success) {
                            console.log('✅ Transfer completed email sent successfully');
                        } else {
                            console.log('❌ Transfer completed email failed:', emailResult.error);
                        }
                    } catch (emailError) {
                        console.error('❌ Exception sending transfer completed email:', emailError);
                    }
                } else {
                    console.log('❌ Sending hospital manager user not found! Manager ID:', sendingHospital.manager);
                }
            } else {
                console.log('❌ Sending hospital has no manager assigned!');
            }
        } else {
            console.log('❌ Sending hospital not found! ID:', transfer.toHospital.id);
        }
        
        // Update hospital stats
        await updateHospitalStats(hospital._id);
        await updateHospitalStats(transfer.toHospital.id);
        
        console.log('\n✅ Transfer completed successfully');
        console.log(`User notifications sent: ${userNotificationsSent.length}`);
        
        res.json({
            message: `Transfer confirmed! ${userNotificationsSent.length} user notifications sent.`,
            transfer,
            userNotificationsSent: userNotificationsSent.length
        });
    } catch (error) {
        console.error('Confirm receipt error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get transfer history
// @route   GET /api/transfers/history
const getTransferHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const hospital = await Hospital.findOne({ manager: userId });
        
        if (!hospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }
        
        const transfers = await Transfer.find({
            $or: [
                { 'fromHospital.id': hospital._id },
                { 'toHospital.id': hospital._id }
            ]
        }).sort({ createdAt: -1 });
        
        res.json(transfers);
    } catch (error) {
        console.error('Get transfer history error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all hospitals (OPTIMIZED)
// @route   GET /api/transfers/hospitals
const getAllHospitals = async (req, res) => {
    try {
        // Get all hospitals with basic info only
        const hospitals = await Hospital.find({ isActive: true })
            .select('name district address phone email manager')
            .sort({ name: 1 })
            .lean();
        
        // Get stock summaries in parallel with limits
        const hospitalsWithStock = await Promise.all(hospitals.map(async (hospital) => {
            // Use countDocuments instead of find for better performance
            const medicineCount = await Medicine.countDocuments({
                'stocks.hospitalId': hospital._id
            });
            
            // Aggregate stock quantity
            const stockAgg = await Medicine.aggregate([
                { $match: { 'stocks.hospitalId': hospital._id } },
                { $unwind: "$stocks" },
                { $match: { 'stocks.hospitalId': hospital._id } },
                { $group: { _id: null, totalStock: { $sum: "$stocks.availableQuantity" } } }
            ]).allowDiskUse(true);
            
            const totalStock = stockAgg[0]?.totalStock || 0;
            
            // Count low stock items efficiently
            const lowStockCount = await Medicine.countDocuments({
                'stocks.hospitalId': hospital._id,
                'stocks.availableQuantity': { $lt: 50, $gt: 0 }
            });
            
            return {
                _id: hospital._id,
                name: hospital.name,
                district: hospital.district,
                address: hospital.address || '',
                phone: hospital.phone || '',
                email: hospital.email || '',
                manager: hospital.manager,
                stats: { 
                    totalItems: medicineCount,
                    totalStock: totalStock,
                    lowStockCount: lowStockCount
                }
            };
        }));
        
        res.json(hospitalsWithStock);
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get hospital stock (OPTIMIZED)
// @route   GET /api/transfers/hospital/:id/stock
const getHospitalStock = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await Hospital.findById(id).lean();
        
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        
        // Get medicines with this hospital's stock, limit to 100 for performance
        const medicines = await Medicine.find({
            'stocks.hospitalId': hospital._id
        })
        .select('medicineName genericName weight unit manufacturer stocks')
        .sort({ medicineName: 1 })
        .limit(100) // Limit results for better performance
        .lean();
        
        const stock = [];
        
        for (const medicine of medicines) {
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );
            
            if (stockEntry && stockEntry.availableQuantity > 0) {
                stock.push({
                    medicineId: medicine._id,
                    medicineName: medicine.medicineName,
                    genericName: medicine.genericName || '',
                    weight: medicine.weight,
                    unit: medicine.unit,
                    manufacturer: medicine.manufacturer || '',
                    availableQuantity: stockEntry.availableQuantity,
                    status: stockEntry.status,
                    lastUpdated: stockEntry.lastUpdated
                });
            }
        }
        
        res.json({ 
            hospital: {
                id: hospital._id,
                name: hospital.name,
                district: hospital.district
            },
            stock,
            totalMedicines: stock.length,
            totalStock: stock.reduce((sum, m) => sum + m.availableQuantity, 0)
        });
    } catch (error) {
        console.error('Get hospital stock error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate PDF for transfer
// @route   GET /api/transfers/:id/pdf
const generateTransferPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const transfer = await Transfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }
        
        // Check authorization - only involved hospitals can view PDF
        const hospital = await Hospital.findOne({ manager: userId });
        if (!hospital || (transfer.fromHospital.id.toString() !== hospital._id.toString() && 
            transfer.toHospital.id.toString() !== hospital._id.toString())) {
            return res.status(403).json({ message: 'Not authorized to view this document' });
        }
        
        const result = await generateTransferDocument(transfer, 'transfer');
        
        // Save PDF reference to transfer
        transfer.pdfDocument = {
            fileName: result.fileName,
            filePath: result.filePath,
            generatedAt: new Date()
        };
        await transfer.save();
        
        // Send file
        res.download(result.filePath, result.fileName);
    } catch (error) {
        console.error('Generate PDF error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download existing PDF
// @route   GET /api/transfers/:id/download-pdf
const downloadTransferPDF = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        
        const transfer = await Transfer.findById(id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }
        
        // Check authorization
        const hospital = await Hospital.findOne({ manager: userId });
        if (!hospital || (transfer.fromHospital.id.toString() !== hospital._id.toString() && 
            transfer.toHospital.id.toString() !== hospital._id.toString())) {
            return res.status(403).json({ message: 'Not authorized to view this document' });
        }
        
        if (!transfer.pdfDocument || !transfer.pdfDocument.filePath) {
            return res.status(404).json({ message: 'PDF not found. Please generate first.' });
        }
        
        if (!fs.existsSync(transfer.pdfDocument.filePath)) {
            return res.status(404).json({ message: 'PDF file not found on server' });
        }
        
        res.download(transfer.pdfDocument.filePath, transfer.pdfDocument.fileName);
    } catch (error) {
        console.error('Download PDF error:', error);
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get ward activities for manager's hospital
// @route   GET /api/transfers/ward-activities
const getWardActivities = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const user = await User.findById(req.user.id);
        
        // Get the hospital managed by this manager
        const hospital = await Hospital.findOne({ manager: user._id });
        if (!hospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }

        const { ward, activityType, startDate, endDate, page = 1, limit = 50 } = req.query;
        
        const query = {
            hospitalId: hospital._id
        };

        if (ward && ward !== 'all') {
            query.wardName = ward;
        }

        if (activityType && activityType !== 'all') {
            query.activityType = activityType;
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
        
        const [activities, total] = await Promise.all([
            WardActivity.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            WardActivity.countDocuments(query)
        ]);

        // Get unique wards in this hospital
        const wards = await WardActivity.distinct('wardName', { hospitalId: hospital._id });

        // Get statistics
        const stats = {
            totalDispenses: await WardActivity.countDocuments({ ...query, activityType: 'dispense' }),
            totalQuantityDispensed: await WardActivity.aggregate([
                { $match: { ...query, activityType: 'dispense' } },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]).then(result => result[0]?.total || 0),
            topDispensedMedicines: await WardActivity.aggregate([
                { $match: { ...query, activityType: 'dispense' } },
                { $group: { _id: '$medicineName', total: { $sum: '$quantity' } } },
                { $sort: { total: -1 } },
                { $limit: 5 }
            ]),
            activitiesByWard: await WardActivity.aggregate([
                { $match: query },
                { $group: { _id: '$wardName', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } },
                { $sort: { totalQuantity: -1 } }
            ])
        };

        res.json({
            activities,
            wards,
            stats,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get ward activities error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get ward stock summary
// @route   GET /api/transfers/ward-stock-summary
const getWardStockSummary = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const user = await User.findById(req.user.id);
        
        // Get the hospital managed by this manager
        const hospital = await Hospital.findOne({ manager: user._id });
        if (!hospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }
        
        // Get all nurses and their wards in this hospital
        const nurses = await User.find({ 
            hospitalId: hospital._id,
            role: 'nurse',
            isActive: true
        });

        const wardSummary = [];
        
        for (const nurse of nurses) {
            if (!nurse.ward) continue; // Skip nurses without ward assignment
            
            // Get recent activities for this ward
            const recentActivities = await WardActivity.find({
                hospitalId: hospital._id,
                wardName: nurse.ward,
                createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
            }).sort({ createdAt: -1 }).limit(10);
            
            // Get total dispensed this week
            const weeklyDispensed = await WardActivity.aggregate([
                {
                    $match: {
                        hospitalId: hospital._id,
                        wardName: nurse.ward,
                        activityType: 'dispense',
                        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    }
                },
                { $group: { _id: null, total: { $sum: '$quantity' } } }
            ]);
            
            // Get top medicines used in this ward
            const topMedicines = await WardActivity.aggregate([
                {
                    $match: {
                        hospitalId: hospital._id,
                        wardName: nurse.ward,
                        activityType: 'dispense'
                    }
                },
                { $group: { _id: '$medicineName', total: { $sum: '$quantity' } } },
                { $sort: { total: -1 } },
                { $limit: 5 }
            ]);
            
            wardSummary.push({
                wardName: nurse.ward,
                wardNumber: nurse.wardNumber || '',
                nurseName: nurse.name,
                nurseEmail: nurse.email,
                weeklyDispensed: weeklyDispensed[0]?.total || 0,
                topMedicines: topMedicines,
                recentActivities: recentActivities,
                lastActivity: recentActivities[0]?.createdAt || null
            });
        }
        
        // Also include wards that might have activities but no assigned nurse
        const wardsWithActivities = await WardActivity.distinct('wardName', { hospitalId: hospital._id });
        for (const wardName of wardsWithActivities) {
            if (!wardSummary.some(w => w.wardName === wardName)) {
                // Get recent activities for this ward
                const recentActivities = await WardActivity.find({
                    hospitalId: hospital._id,
                    wardName: wardName,
                    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }).sort({ createdAt: -1 }).limit(10);
                
                const weeklyDispensed = await WardActivity.aggregate([
                    {
                        $match: {
                            hospitalId: hospital._id,
                            wardName: wardName,
                            activityType: 'dispense',
                            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                        }
                    },
                    { $group: { _id: null, total: { $sum: '$quantity' } } }
                ]);
                
                const topMedicines = await WardActivity.aggregate([
                    {
                        $match: {
                            hospitalId: hospital._id,
                            wardName: wardName,
                            activityType: 'dispense'
                        }
                    },
                    { $group: { _id: '$medicineName', total: { $sum: '$quantity' } } },
                    { $sort: { total: -1 } },
                    { $limit: 5 }
                ]);
                
                wardSummary.push({
                    wardName: wardName,
                    wardNumber: '',
                    nurseName: 'No assigned nurse',
                    nurseEmail: '',
                    weeklyDispensed: weeklyDispensed[0]?.total || 0,
                    topMedicines: topMedicines,
                    recentActivities: recentActivities,
                    lastActivity: recentActivities[0]?.createdAt || null
                });
            }
        }
        
        // Sort by weekly dispensed
        wardSummary.sort((a, b) => b.weeklyDispensed - a.weeklyDispensed);
        
        res.json({
            hospital: {
                id: hospital._id,
                name: hospital.name,
                district: hospital.district
            },
            wards: wardSummary,
            totalWards: wardSummary.length,
            totalDispensed: wardSummary.reduce((sum, w) => sum + w.weeklyDispensed, 0)
        });
    } catch (error) {
        console.error('Get ward stock summary error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get ward inventory for a specific ward
// @route   GET /api/transfers/ward-inventory/:wardName
const getWardInventory = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const { wardName } = req.params;
        const user = await User.findById(req.user.id);
        
        const hospital = await Hospital.findOne({ manager: user._id });
        if (!hospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }

        // Get all medicines that have been used in this ward
        const activities = await WardActivity.aggregate([
            {
                $match: {
                    hospitalId: hospital._id,
                    wardName: wardName
                }
            },
            {
                $group: {
                    _id: '$medicineId',
                    medicineName: { $first: '$medicineName' },
                    weight: { $first: '$weight' },
                    unit: { $first: '$unit' },
                    totalDispensed: { $sum: { $cond: [{ $eq: ['$activityType', 'dispense'] }, '$quantity', 0] } },
                    lastUsed: { $max: '$createdAt' },
                    recentActivity: { $last: '$$ROOT' }
                }
            },
            { $sort: { totalDispensed: -1 } }
        ]);

        // Get recent activities for this ward
        const recentActivities = await WardActivity.find({
            hospitalId: hospital._id,
            wardName: wardName
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

        res.json({
            ward: wardName,
            hospital: hospital.name,
            inventory: activities,
            recentActivities: recentActivities,
            totalMedicinesUsed: activities.length,
            totalDispensed: activities.reduce((sum, a) => sum + a.totalDispensed, 0)
        });
    } catch (error) {
        console.error('Get ward inventory error:', error);
        res.status(500).json({ message: error.message });
    }
};



module.exports = {
    createTransferRequest,
    getPendingRequests,
    approveTransfer,
    rejectTransfer,
    confirmReceipt,
    getTransferHistory,
    getAllHospitals,
    getHospitalStock,
    generateTransferPDF,
    downloadTransferPDF,
    getWardActivities,
    getWardStockSummary,
    getWardInventory,

};