const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
    medicineId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine',
        required: true
    },
    medicineName: {
        type: String,
        required: true
    },
    weight: Number,
    unit: String,
    prescribedQuantity: {
        type: Number,
        required: true,
        min: 1
    },
    dispensedQuantity: {
        type: Number,
        default: 0
    },
    remainingQuantity: {
        type: Number,
        default: function() {
            return this.prescribedQuantity;
        }
    },
    status: {
        type: String,
        enum: ['pending', 'partial', 'completed', 'cancelled'],
        default: 'pending'
    },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' },
    instructions: { type: String, default: '' },
    addedAt: { type: Date, default: Date.now }
});

const editHistorySchema = new mongoose.Schema({
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedByName: String,
    changes: {
        addedItems: [prescriptionItemSchema],
        removedItems: [{
            medicineId: mongoose.Schema.Types.ObjectId,
            medicineName: String,
            quantity: Number
        }],
        updatedItems: [{
            medicineId: mongoose.Schema.Types.ObjectId,
            medicineName: String,
            oldQuantity: Number,
            newQuantity: Number
        }]
    },
    reason: String
});

const prescriptionSchema = new mongoose.Schema({
    prescriptionId: {
        type: String,
        unique: true,
        default: () => `RX-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },
    patientId: {
        type: String,
        required: true
    },
    patientName: {
        type: String,
        required: true
    },
    patientAge: Number,
    patientGender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: ''
    },
    doctorName: {
        type: String,
        default: ''
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    hospitalName: String,
    ward: String,
    nurseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    nurseName: String,
    items: [prescriptionItemSchema],
    notes: { type: String, default: '' },
    status: {
        type: String,
        enum: ['active', 'partial', 'completed', 'cancelled'],
        default: 'active'
    },
    editHistory: [editHistorySchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: Date,
    cancelledAt: Date,
    cancelledReason: String
});

prescriptionSchema.index({ patientId: 1, status: 1 });
prescriptionSchema.index({ hospitalId: 1, createdAt: -1 });
prescriptionSchema.index({ prescriptionId: 1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);