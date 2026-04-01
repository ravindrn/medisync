const mongoose = require('mongoose');

const donationItemSchema = new mongoose.Schema({
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
    quantity: {
        type: Number,
        required: true,
        min: 1
    }
});

const donationSchema = new mongoose.Schema({
    donationId: {
        type: String,
        unique: true,
        default: function() {
            return `DON-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        }
    },
    donorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

        editHistory: [{
        editedAt: { type: Date, default: Date.now },
        previousItems: [donationItemSchema],
        previousTotalItems: Number,
        previousTotalQuantity: Number,
        editedBy: String,
        reason: String
    }],
    isEdited: { type: Boolean, default: false },
    donorName: {
        type: String,
        required: true
    },
    donorEmail: {
        type: String,
        required: true
    },
    donorPhone: {
        type: String,
        default: ''
    },
    items: [donationItemSchema],
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true
    },
    hospitalName: {
        type: String,
        required: true
    },
    hospitalDistrict: {
        type: String,
        required: true
    },
    totalItems: {
        type: Number,
        default: 0
    },
    totalQuantity: {
        type: Number,
        default: 0
    },
    // Update the status enum
        status: {
            type: String,
            enum: ['pending', 'approved', 'delivered', 'completed', 'rejected', 'cancelled'],
            default: 'pending'
        },
        managerConfirmedAt: { type: Date },
        managerConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        managerNotes: { type: String },
    notes: {
        type: String,
        default: ''
    },
    adminNotes: {
        type: String,
        default: ''
    },
    deliveryLocation: {
        type: String,
        default: ''
    },
    deliveryDate: {
        type: Date
    },
    certificate: {
        certificateId: String,
        fileName: String,
        filePath: String,
        generatedAt: Date,
        downloadedAt: Date
    },
    rejectedReason: {
        type: String,
        default: ''
    },
    rejectedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamps on save
donationSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Update timestamps on update
donationSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

// Create indexes for better query performance
donationSchema.index({ donorId: 1, status: 1 });
donationSchema.index({ hospitalId: 1, status: 1 });
donationSchema.index({ donationId: 1 });
donationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Donation', donationSchema);