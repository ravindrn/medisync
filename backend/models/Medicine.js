const mongoose = require('mongoose');

const medicineStockSchema = new mongoose.Schema({
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        required: true,
        index: true
    },
    hospitalName: {
        type: String,
        required: true
    },
    district: {
        type: String, 
        required: true,
        index: true
    },
    availableQuantity: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Available', 'Low Stock', 'Out of Stock', 'Critical'],
        default: 'Available'
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

const medicineSchema = new mongoose.Schema({
    medicineName: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    genericName: {
        type: String,
        trim: true
    },
    weight: {
        type: Number,
        required: true
    },
    unit: {
        type: String,
        required: true,
        enum: ['mg', 'g', 'mcg', 'ml', 'IU']
    },
    manufacturer: {
        type: String,
        trim: true
    },
    stocks: [medicineStockSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
});

// Indexes
medicineSchema.index({ medicineName: 'text', genericName: 'text' });
medicineSchema.index({ 'stocks.district': 1 });
medicineSchema.index({ 'stocks.hospitalId': 1 });

// Pre-save middleware
medicineStockSchema.pre('save', function(next) {
    if (this.availableQuantity <= 0) {
        this.status = 'Out of Stock';
    } else if (this.availableQuantity < 10) {
        this.status = 'Critical';
    } else if (this.availableQuantity < 50) {
        this.status = 'Low Stock';
    } else {
        this.status = 'Available';
    }
    this.lastUpdated = new Date();
    next();
});

medicineSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Virtual for total stock across all hospitals
medicineSchema.virtual('totalStock').get(function() {
    return this.stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
});

// Static method to get hospital stock
medicineSchema.statics.getHospitalStock = async function(hospitalId) {
    return await this.find({
        'stocks.hospitalId': hospitalId
    }).select('medicineName genericName weight unit manufacturer stocks');
};

// Static method to update stock for a hospital
medicineSchema.statics.updateStock = async function(medicineId, hospitalId, newQuantity, userId) {
    const medicine = await this.findById(medicineId);
    if (!medicine) {
        throw new Error('Medicine not found');
    }
    
    const stockIndex = medicine.stocks.findIndex(
        stock => stock.hospitalId.toString() === hospitalId.toString()
    );
    
    if (stockIndex === -1) {
        throw new Error('Stock not found for this hospital');
    }
    
    medicine.stocks[stockIndex].availableQuantity = newQuantity;
    medicine.stocks[stockIndex].updatedBy = userId;
    medicine.stocks[stockIndex].lastUpdated = new Date();
    
    await medicine.save();
    return medicine;
};

module.exports = mongoose.model('Medicine', medicineSchema);