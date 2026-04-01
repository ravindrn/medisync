const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportId: {
        type: String,
        unique: true,
        default: () => `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    },
    type: {
        type: String,
        enum: ['stock', 'shortages', 'excess'],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    generatedBy: {
        id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: String,
        email: String,
        role: String
    },
    fileName: String,
    fileSize: Number,
    recordCount: Number,
    downloadCount: {
        type: Number,
        default: 0
    },
    lastDownloaded: Date,
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
});

reportSchema.index({ generatedBy: 1, createdAt: -1 });
reportSchema.index({ type: 1 });

module.exports = mongoose.model('Report', reportSchema);