const mongoose = require('mongoose');

const stockHistorySchema = new mongoose.Schema({
    medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    medicineName: String,
    weight: Number,
    unit: String,
    hospitalName: String,
    district: String,
    oldQuantity: Number,
    newQuantity: Number,
    changeAmount: Number,
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('StockHistory', stockHistorySchema);