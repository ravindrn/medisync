const mongoose = require('mongoose');

const stockUpdateHistorySchema = new mongoose.Schema({
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    medicineName: {
        type: String,
        required: true
    },
    weight: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true
    },
    hospitalName: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    oldQuantity: {
        type: Number,
        required: true
    },
    newQuantity: {
        type: Number,
        required: true
    },
    changeAmount: {
        type: Number,
        required: true
    },
    updatedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: String,
        email: String
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('StockUpdateHistory', stockUpdateHistorySchema);