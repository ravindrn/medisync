const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    medicine: {
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
    district: {
        type: String,
        required: true
    },
    hospitalName: String,
    status: {
        type: String,
        enum: ['pending', 'notified', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    notifiedAt: Date,
    stockAvailableAt: Date
});

module.exports = mongoose.model('Notification', notificationSchema);