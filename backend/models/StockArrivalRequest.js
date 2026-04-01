const mongoose = require('mongoose');

const stockArrivalMedicineSchema = new mongoose.Schema({
    medicineName: {
        type: String,
        required: true,
        trim: true
    },
    weight: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        default: 'mg'
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    batchNumber: {
        type: String,
        default: ''
    },
    expiryDate: {
        type: Date,
        default: null
    }
}, { _id: false });

const stockArrivalRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        unique: true
    },

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

    medicines: {
        type: [stockArrivalMedicineSchema],
        required: true
    },

    notes: {
        type: String,
        default: ''
    },

    requestedBy: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: String,
        email: String
    },

    arrivalDate: {
        type: Date,
        default: Date.now
    },

    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    adminNotes: {
        type: String,
        default: ''
    },

    rejectionReason: {
        type: String,
        default: ''
    },

    reviewedBy: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        name: String,
        email: String
    },

    reviewedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

stockArrivalRequestSchema.pre('save', function (next) {
    if (!this.requestId) {
        this.requestId = 'SAR-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    }
    next();
});

module.exports = mongoose.model('StockArrivalRequest', stockArrivalRequestSchema);