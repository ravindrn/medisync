const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const { 
    sendDonationEmail,
    sendDonationApprovalEmail,
    sendDonationRejectedEmail,
    sendDonationCertificateEmail,
    sendDonationNotificationToHospital,
    sendDonationCompletedNotification,
    sendDonationUpdateEmail,
    sendDonationCancelledEmail
    
} = require('../services/emailService');
const { generateTransferDocument } = require('../services/pdfService');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Helper function to generate donation certificate
const generateDonationCertificate = async (donation, hospital) => {
    return new Promise((resolve, reject) => {
        try {
            // Create certificates directory if it doesn't exist
            const certsDir = path.join(__dirname, '../certificates');
            if (!fs.existsSync(certsDir)) {
                fs.mkdirSync(certsDir, { recursive: true });
            }
            
            const certificateId = `DON-CERT-${donation.donationId}`;
            const fileName = `certificate_${donation.donationId}_${Date.now()}.pdf`;
            const filePath = path.join(certsDir, fileName);
            
            const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
            const stream = fs.createWriteStream(filePath);
            
            doc.pipe(stream);
            
            // Border
            doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
               .stroke('#10b981');
            
            // Decorative elements
            doc.fillColor('#10b981')
               .fontSize(12)
               .text('❤️', 50, 50);
            doc.fillColor('#10b981')
               .fontSize(12)
               .text('❤️', doc.page.width - 70, 50);
            
            // Header
            doc.fillColor('#10b981')
               .fontSize(28)
               .font('Helvetica-Bold')
               .text('CERTIFICATE OF APPRECIATION', 0, 100, { align: 'center' });
            
            doc.fillColor('#6b7280')
               .fontSize(12)
               .font('Helvetica')
               .text('Presented to', 0, 160, { align: 'center' });
            
            // Donor Name
            doc.fillColor('#1f2937')
               .fontSize(36)
               .font('Helvetica-Bold')
               .text(donation.donorName, 0, 190, { align: 'center' });
            
            doc.fillColor('#6b7280')
               .fontSize(14)
               .font('Helvetica')
               .text('In recognition of your generous contribution to healthcare', 0, 250, { align: 'center' });
            
            // Donation Details
            doc.fontSize(12)
               .font('Helvetica')
               .text('Medicines Donated', 0, 310, { align: 'center' });
            
            let y = 340;
            donation.items.forEach((item, index) => {
                if (index < 5) {
                    doc.fillColor('#374151')
                       .fontSize(10)
                       .text(`${item.medicineName} (${item.weight}${item.unit}) - ${item.quantity} units`, 0, y, { align: 'center' });
                    y += 15;
                }
            });
            
            if (donation.items.length > 5) {
                doc.fillColor('#9ca3af')
                   .fontSize(9)
                   .text(`+ ${donation.items.length - 5} more items`, 0, y, { align: 'center' });
                y += 15;
            }
            
            // Hospital Info
            y += 20;
            doc.fillColor('#10b981')
               .fontSize(12)
               .font('Helvetica-Bold')
               .text('Donated To', 0, y, { align: 'center' });
            y += 20;
            doc.fillColor('#374151')
               .fontSize(11)
               .font('Helvetica')
               .text(hospital.name, 0, y, { align: 'center' });
            y += 15;
            doc.fillColor('#6b7280')
               .fontSize(10)
               .text(`${hospital.district} District`, 0, y, { align: 'center' });
            
            // Certificate ID
            y = doc.page.height - 100;
            doc.fillColor('#9ca3af')
               .fontSize(8)
               .text(`Certificate ID: ${certificateId}`, 50, y);
            doc.text(`Date: ${new Date(donation.completedAt || donation.createdAt).toLocaleDateString()}`, doc.page.width - 150, y);
            
            // Signatures
            const signatureY = doc.page.height - 50;
            
            // Hospital Manager Signature
            doc.fillColor('#374151')
               .fontSize(10)
               .text('Hospital Manager', 80, signatureY - 30);
            doc.moveTo(70, signatureY).lineTo(200, signatureY).stroke();
            
            // MediSync Chairman Signature
            doc.fillColor('#374151')
               .fontSize(10)
               .text('Chairman, MediSync', doc.page.width - 200, signatureY - 30);
            doc.moveTo(doc.page.width - 190, signatureY).lineTo(doc.page.width - 70, signatureY).stroke();
            
            doc.end();
            
            stream.on('finish', () => {
                resolve({ 
                    success: true, 
                    certificateId, 
                    fileName, 
                    filePath 
                });
            });
            
            stream.on('error', (error) => {
                reject(error);
            });
            
        } catch (error) {
            reject(error);
        }
    });
};

// @desc    Get urgent shortages for donors
// @route   GET /api/donor/shortages
const getShortages = async (req, res) => {
    try {
        // Get medicines with low stock (<50 units) across all hospitals
        const medicines = await Medicine.find({}).lean();
        const shortages = [];
        
        for (const medicine of medicines) {
            for (const stock of medicine.stocks) {
                if (stock.availableQuantity < 50 && stock.availableQuantity > 0) {
                    shortages.push({
                        medicineId: medicine._id,
                        medicineName: medicine.medicineName,
                        weight: medicine.weight,
                        unit: medicine.unit,
                        hospitalId: stock.hospitalId,
                        hospitalName: stock.hospitalName,
                        district: stock.district,
                        currentStock: stock.availableQuantity,
                        shortageAmount: 50 - stock.availableQuantity,
                        urgency: stock.availableQuantity < 10 ? 'Critical' : 'Low'
                    });
                }
            }
        }
        
        // Group by medicine for better display
        const groupedShortages = {};
        shortages.forEach(s => {
            const key = `${s.medicineName}_${s.weight}_${s.unit}`;
            if (!groupedShortages[key]) {
                groupedShortages[key] = {
                    medicineId: s.medicineId,
                    medicineName: s.medicineName,
                    weight: s.weight,
                    unit: s.unit,
                    totalShortage: 0,
                    hospitals: []
                };
            }
            groupedShortages[key].totalShortage += s.shortageAmount;
            groupedShortages[key].hospitals.push({
                hospitalId: s.hospitalId,
                hospitalName: s.hospitalName,
                district: s.district,
                currentStock: s.currentStock,
                shortageAmount: s.shortageAmount,
                urgency: s.urgency
            });
        });
        
        res.json({
            shortages: Object.values(groupedShortages),
            totalShortages: shortages.length,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get shortages error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all medicines for donor selection
// @route   GET /api/donor/medicines
const getAllMedicines = async (req, res) => {
    try {
        const medicines = await Medicine.find({})
            .select('medicineName weight unit')
            .sort({ medicineName: 1 })
            .lean();
        
        // Get unique medicines
        const uniqueMedicines = [];
        const seen = new Set();
        
        medicines.forEach(med => {
            const key = `${med.medicineName}_${med.weight}_${med.unit}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMedicines.push({
                    medicineId: med._id,
                    medicineName: med.medicineName,
                    weight: med.weight,
                    unit: med.unit
                });
            }
        });
        
        res.json(uniqueMedicines);
    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all hospitals for donor selection
// @route   GET /api/donor/hospitals
const getHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({ isActive: true })
            .select('name district address')
            .sort({ name: 1 })
            .lean();
        
        res.json(hospitals);
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create donation pledge
// @route   POST /api/donor/pledge
const createDonation = async (req, res) => {
    try {
        const { items, hospitalId, notes } = req.body;
        const userId = req.user.id;
        
        const user = await User.findById(userId);
        const hospital = await Hospital.findById(hospitalId);
        
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        
        // Validate items
        let totalItems = 0;
        let totalQuantity = 0;
        const donationItems = [];
        
        for (const item of items) {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) {
                return res.status(404).json({ message: `Medicine not found: ${item.medicineId}` });
            }
            
            donationItems.push({
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                quantity: item.quantity
            });
            
            totalItems++;
            totalQuantity += item.quantity;
        }
        
        const donation = await Donation.create({
            donorId: userId,
            donorName: user.name,
            donorEmail: user.email,
            donorPhone: user.phone || '',
            items: donationItems,
            hospitalId: hospital._id,
            hospitalName: hospital.name,
            hospitalDistrict: hospital.district,
            totalItems,
            totalQuantity,
            notes,
            status: 'pending'
        });
        
        // Send email confirmation to donor
        await sendDonationEmail(user.email, user.name, donation);
        
        res.status(201).json({
            message: 'Donation pledge created successfully. Admin will review your request.',
            donation
        });
    } catch (error) {
        console.error('Create donation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get donor's donation history
// @route   GET /api/donor/history
const getDonationHistory = async (req, res) => {
    try {
        const donations = await Donation.find({ donorId: req.user.id })
            .sort({ createdAt: -1 })
            .lean();
        
        res.json(donations);
    } catch (error) {
        console.error('Get donation history error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get donation details
// @route   GET /api/donor/donation/:id
const getDonationDetails = async (req, res) => {
    try {
        const donation = await Donation.findOne({
            _id: req.params.id,
            donorId: req.user.id
        }).lean();
        
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
        
        res.json(donation);
    } catch (error) {
        console.error('Get donation details error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download donation certificate
// @route   GET /api/donor/certificate/:id
const downloadCertificate = async (req, res) => {
    try {
        const donation = await Donation.findOne({
            _id: req.params.id,
            donorId: req.user.id,
            status: 'completed'
        });
        
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found or not completed' });
        }
        
        // Generate certificate if not exists
        if (!donation.certificate || !donation.certificate.filePath) {
            const hospital = await Hospital.findById(donation.hospitalId);
            const result = await generateDonationCertificate(donation, hospital);
            
            donation.certificate = {
                certificateId: result.certificateId,
                fileName: result.fileName,
                filePath: result.filePath,
                generatedAt: new Date()
            };
            await donation.save();
        }
        
        // Update download count
        donation.certificate.downloadedAt = new Date();
        await donation.save();
        
        // Check if file exists
        if (fs.existsSync(donation.certificate.filePath)) {
            res.download(donation.certificate.filePath, donation.certificate.fileName);
        } else {
            // Regenerate if file doesn't exist
            const hospital = await Hospital.findById(donation.hospitalId);
            const result = await generateDonationCertificate(donation, hospital);
            
            donation.certificate = {
                certificateId: result.certificateId,
                fileName: result.fileName,
                filePath: result.filePath,
                generatedAt: new Date()
            };
            await donation.save();
            
            res.download(result.filePath, result.fileName);
        }
    } catch (error) {
        console.error('Download certificate error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ==================== ADMIN DONATION MANAGEMENT ====================

// @desc    Get all donation requests (admin)
// @route   GET /api/donor/admin/requests
const getDonationRequests = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        
        const { status = 'all', page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const query = {};
        if (status !== 'all') {
            query.status = status;
        }
        
        const [donations, total] = await Promise.all([
            Donation.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Donation.countDocuments(query)
        ]);
        
        res.json({
            donations,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get donation requests error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve donation and assign to hospital
// @route   PUT /api/donor/admin/approve/:id
const approveDonation = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        
        const { id } = req.params;
        const { deliveryLocation, deliveryDate, adminNotes } = req.body;
        
        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
        
        donation.status = 'approved';
        donation.adminNotes = adminNotes || '';
        donation.deliveryLocation = deliveryLocation;
        donation.deliveryDate = deliveryDate ? new Date(deliveryDate) : null;
        donation.updatedAt = new Date();
        
        await donation.save();
        
        // Notify donor
        const donor = await User.findById(donation.donorId);
        const hospital = await Hospital.findById(donation.hospitalId);
        
        await sendDonationApprovalEmail(donor.email, donor.name, donation, hospital);
        
        // Notify hospital manager
        const hospitalManager = await User.findById(hospital.manager);
        if (hospitalManager) {
            await sendDonationNotificationToHospital(hospitalManager.email, hospitalManager.name, donation, donor);
        }
        
        res.json({
            message: 'Donation approved successfully',
            donation
        });
    } catch (error) {
        console.error('Approve donation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Complete donation (stock added)
// @route   PUT /api/donor/admin/complete/:id
const completeDonation = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        
        const { id } = req.params;
        
        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
        
        // Add stock to hospital
        const hospital = await Hospital.findById(donation.hospitalId);
        
        for (const item of donation.items) {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) continue;
            
            // Find existing stock for this hospital
            const existingStockIndex = medicine.stocks.findIndex(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );
            
            if (existingStockIndex !== -1) {
                medicine.stocks[existingStockIndex].availableQuantity += item.quantity;
                medicine.stocks[existingStockIndex].lastUpdated = new Date();
                medicine.stocks[existingStockIndex].status = 
                    medicine.stocks[existingStockIndex].availableQuantity < 10 ? 'Critical' :
                    medicine.stocks[existingStockIndex].availableQuantity < 50 ? 'Low Stock' : 'Available';
            } else {
                medicine.stocks.push({
                    hospitalId: hospital._id,
                    hospitalName: hospital.name,
                    district: hospital.district,
                    availableQuantity: item.quantity,
                    status: item.quantity < 10 ? 'Critical' : item.quantity < 50 ? 'Low Stock' : 'Available',
                    lastUpdated: new Date()
                });
            }
            
            await medicine.save();
        }
        
        donation.status = 'completed';
        donation.completedAt = new Date();
        donation.updatedAt = new Date();
        
        await donation.save();
        
        // Generate certificate
        const result = await generateDonationCertificate(donation, hospital);
        donation.certificate = {
            certificateId: result.certificateId,
            fileName: result.fileName,
            filePath: result.filePath,
            generatedAt: new Date()
        };
        await donation.save();
        
        // Send certificate email to donor
        const donor = await User.findById(donation.donorId);
        await sendDonationCertificateEmail(donor.email, donor.name, donation, result);
        
        // Notify hospital manager
        const hospitalManager = await User.findById(hospital.manager);
        if (hospitalManager) {
            await sendDonationCompletedNotification(hospitalManager.email, hospitalManager.name, donation, donor);
        }
        
        res.json({
            message: 'Donation completed successfully. Certificate generated.',
            donation
        });
    } catch (error) {
        console.error('Complete donation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject donation
// @route   PUT /api/donor/admin/reject/:id
const rejectDonation = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        
        const { id } = req.params;
        const { reason } = req.body;
        
        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
        
        donation.status = 'rejected';
        donation.rejectedReason = reason || 'No reason provided';
        donation.rejectedAt = new Date();
        donation.updatedAt = new Date();
        
        await donation.save();
        
        // Notify donor
        const donor = await User.findById(donation.donorId);
        await sendDonationRejectedEmail(donor.email, donor.name, donation, reason);
        
        res.json({
            message: 'Donation rejected',
            donation
        });
    } catch (error) {
        console.error('Reject donation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update pending donation
// @route   PUT /api/donor/donation/:id
const updateDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, hospitalId, notes } = req.body;
        const userId = req.user.id;

        const donation = await Donation.findOne({
            _id: id,
            donorId: userId,
            status: 'pending'
        });

        if (!donation) {
            return res.status(404).json({ 
                message: 'Donation not found or cannot be edited (already approved/rejected)' 
            });
        }

        // Save current state to edit history
        const previousState = {
            previousItems: JSON.parse(JSON.stringify(donation.items)),
            previousTotalItems: donation.totalItems,
            previousTotalQuantity: donation.totalQuantity,
            editedAt: new Date(),
            editedBy: userId,
            reason: 'User edited donation'
        };

        // Validate and process new items
        let totalItems = 0;
        let totalQuantity = 0;
        const updatedItems = [];

        for (const item of items) {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) {
                return res.status(404).json({ message: `Medicine not found: ${item.medicineId}` });
            }

            updatedItems.push({
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                quantity: item.quantity
            });

            totalItems++;
            totalQuantity += item.quantity;
        }

        // Verify hospital exists
        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        // Update donation
        donation.items = updatedItems;
        donation.totalItems = totalItems;
        donation.totalQuantity = totalQuantity;
        donation.notes = notes || donation.notes;
        donation.hospitalId = hospital._id;
        donation.hospitalName = hospital.name;
        donation.hospitalDistrict = hospital.district;
        donation.isEdited = true;
        donation.editHistory = donation.editHistory || [];
        donation.editHistory.push(previousState);
        donation.updatedAt = new Date();

        await donation.save();

        // Send email notification to admins
        const adminUsers = await User.find({ role: 'admin' });
        for (const admin of adminUsers) {
            await sendDonationUpdateEmail(
                admin.email,
                admin.name,
                donation,
                userId,
                previousState
            );
        }

        res.json({
            message: 'Donation updated successfully. Admin has been notified.',
            donation
        });
    } catch (error) {
        console.error('Update donation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel pending donation
// @route   DELETE /api/donor/donation/:id
const cancelDonation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const donation = await Donation.findOne({
            _id: id,
            donorId: userId,
            status: 'pending'
        });

        if (!donation) {
            return res.status(404).json({ 
                message: 'Donation not found or cannot be cancelled' 
            });
        }

        donation.status = 'cancelled';
        donation.updatedAt = new Date();
        donation.cancelledAt = new Date();
        donation.cancelledBy = userId;

        await donation.save();

        // Send email notification to admins
        const adminUsers = await User.find({ role: 'admin' });
        for (const admin of adminUsers) {
            await sendDonationCancelledEmail(
                admin.email,
                admin.name,
                donation
            );
        }

        res.json({
            message: 'Donation cancelled successfully',
            donation
        });
    } catch (error) {
        console.error('Cancel donation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get donation for editing (only pending)
// @route   GET /api/donor/donation/:id/edit
const getDonationForEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const donation = await Donation.findOne({
            _id: id,
            donorId: userId,
            status: 'pending'
        }).lean();

        if (!donation) {
            return res.status(404).json({ 
                message: 'Donation not found or cannot be edited (already approved/rejected)' 
            });
        }

        res.json(donation);
    } catch (error) {
        console.error('Get donation for edit error:', error);
        res.status(500).json({ message: error.message });
    }
};


// @desc    Manager confirms donation receipt
// @route   PUT /api/donor/manager/confirm/:id
const confirmDonationReceipt = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const { id } = req.params;
        const { notes } = req.body;

        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        // Verify this donation is for the manager's hospital
        const hospital = await Hospital.findOne({ 
            _id: donation.hospitalId,
            manager: req.user.id 
        });

        if (!hospital) {
            return res.status(403).json({ 
                message: 'You are not authorized to confirm this donation' 
            });
        }

        if (donation.status !== 'approved') {
            return res.status(400).json({ 
                message: 'Donation must be approved before confirming receipt' 
            });
        }

        donation.status = 'delivered';
        donation.managerConfirmedAt = new Date();
        donation.managerConfirmedBy = req.user.id;
        donation.managerNotes = notes || '';
        donation.updatedAt = new Date();

        await donation.save();

        // Notify admins that manager has confirmed
        const adminUsers = await User.find({ role: 'admin' });
        for (const admin of adminUsers) {
            await sendDonationDeliveredEmail(
                admin.email,
                admin.name,
                donation,
                hospital,
                req.user
            );
        }

        res.json({
            message: 'Donation receipt confirmed. Admin will complete the process.',
            donation
        });
    } catch (error) {
        console.error('Confirm donation receipt error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending deliveries for manager
// @route   GET /api/donor/manager/pending
const getPendingDeliveries = async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied. Manager only.' });
        }

        const hospital = await Hospital.findOne({ manager: req.user.id });
        if (!hospital) {
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }

        const donations = await Donation.find({
            hospitalId: hospital._id,
            status: 'approved'
        }).sort({ createdAt: -1 });

        res.json({
            hospital: {
                id: hospital._id,
                name: hospital.name,
                district: hospital.district
            },
            donations
        });
    } catch (error) {
        console.error('Get pending deliveries error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Admin completes donation after manager confirmation
// @route   PUT /api/donor/admin/complete-after-delivery/:id
const completeDonationAfterDelivery = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { id } = req.params;

        const donation = await Donation.findById(id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        if (donation.status !== 'delivered') {
            return res.status(400).json({ 
                message: 'Donation must be confirmed by manager before completion' 
            });
        }

        // Add stock to hospital
        const hospital = await Hospital.findById(donation.hospitalId);
        
        for (const item of donation.items) {
            const medicine = await Medicine.findById(item.medicineId);
            if (!medicine) continue;
            
            // Find existing stock for this hospital
            const existingStockIndex = medicine.stocks.findIndex(s => 
                s.hospitalId && s.hospitalId.toString() === hospital._id.toString()
            );
            
            if (existingStockIndex !== -1) {
                medicine.stocks[existingStockIndex].availableQuantity += item.quantity;
                medicine.stocks[existingStockIndex].lastUpdated = new Date();
                medicine.stocks[existingStockIndex].status = 
                    medicine.stocks[existingStockIndex].availableQuantity < 10 ? 'Critical' :
                    medicine.stocks[existingStockIndex].availableQuantity < 50 ? 'Low Stock' : 'Available';
            } else {
                medicine.stocks.push({
                    hospitalId: hospital._id,
                    hospitalName: hospital.name,
                    district: hospital.district,
                    availableQuantity: item.quantity,
                    status: item.quantity < 10 ? 'Critical' : item.quantity < 50 ? 'Low Stock' : 'Available',
                    lastUpdated: new Date()
                });
            }
            
            await medicine.save();
        }
        
        donation.status = 'completed';
        donation.completedAt = new Date();
        donation.updatedAt = new Date();
        
        await donation.save();
        
        // Generate certificate
        const result = await generateDonationCertificate(donation, hospital);
        donation.certificate = {
            certificateId: result.certificateId,
            fileName: result.fileName,
            filePath: result.filePath,
            generatedAt: new Date()
        };
        await donation.save();
        
        // Send certificate email to donor
        const donor = await User.findById(donation.donorId);
        await sendDonationCertificateEmail(donor.email, donor.name, donation, result);
        
        // Notify hospital manager
        const hospitalManager = await User.findById(hospital.manager);
        if (hospitalManager) {
            await sendDonationCompletedNotification(
                hospitalManager.email, 
                hospitalManager.name, 
                donation, 
                donor
            );
        }
        
        res.json({
            message: 'Donation completed successfully. Certificate generated.',
            donation
        });
    } catch (error) {
        console.error('Complete donation after delivery error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getShortages,
    getAllMedicines,
    getHospitals,
    createDonation,
    getDonationHistory,
    getDonationDetails,
    downloadCertificate,
    getDonationRequests,
    approveDonation,
    completeDonation,
    rejectDonation,
    getDonationForEdit,   // Add this
    updateDonation,       // Add this
    cancelDonation,       // Add this
    getPendingDeliveries,           // ← ADD THIS
    confirmDonationReceipt,         // ← ADD THIS
    completeDonationAfterDelivery   // ← ADD THIS

};