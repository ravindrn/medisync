const mongoose = require('mongoose');

const wardActivitySchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    wardName: {
        type: String,
        required: true
    },
    wardNumber: String,
    activityType: {
        type: String,
        enum: ['dispense', 'return', 'transfer_in', 'transfer_out', 'stock_adjustment'],
        required: true
    },
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    medicineName: String,
    weight: Number,
    unit: String,
    quantity: {
        type: Number,
        required: true
    },
    previousStock: Number,
    newStock: Number,
    patientId: String,
    patientName: String,
    nurseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    nurseName: String,
    prescriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Prescription'
    },
    notes: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

wardActivitySchema.index({ hospitalId: 1, createdAt: -1 });
wardActivitySchema.index({ wardName: 1, createdAt: -1 });
wardActivitySchema.index({ medicineId: 1, createdAt: -1 });

module.exports = mongoose.model('WardActivity', wardActivitySchema);