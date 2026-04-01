const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    district: {
        type: String,
        required: true,
        index: true
    },
    address: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    email: {
        type: String,
        default: ''
    },
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true,
        sparse: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Hospital', hospitalSchema);