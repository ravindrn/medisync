const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    requestId: {
        type: String,
        unique: true,
        default: () => `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },
    pdfDocument: {
        fileName: String,
        filePath: String,
        generatedAt: Date
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    type: {
        type: String,
        enum: ['request', 'transfer'],
        default: 'request'
    },
    fromHospital: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
        name: String,
        district: String
    },
    toHospital: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
        name: String,
        district: String
    },
    medicines: [{
        medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        medicineName: String,
        weight: Number,
        unit: String,
        requestedQuantity: Number,
        approvedQuantity: Number,
        status: String
    }], 
    requestedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String
    },
    approvedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String
    },
    rejectionReason: String,
    notes: String,
    transferDocument: {
        documentId: String,
        documentUrl: String,
        generatedAt: Date
    },
    receivedAt: Date,
    completedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transfer', transferSchema);