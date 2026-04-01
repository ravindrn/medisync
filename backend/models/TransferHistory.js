const mongoose = require('mongoose');

const transferHistorySchema = new mongoose.Schema({
    transferId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transfer'
    },
    requestId: String,
    type: {
        type: String,
        enum: ['sent', 'received'],
        required: true
    },
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
    },
    medicineName: String,
    weight: Number,
    unit: String,
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
    quantity: Number,
    status: String,
    initiatedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String
    },
    approvedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String
    },
    confirmedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String
    },
    completedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TransferHistory', transferHistorySchema);