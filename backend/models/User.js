const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const watchlistItemSchema = new mongoose.Schema({
    medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medicine'
    },
    medicineName: String,
    weight: Number,
    unit: String,
    quantityNeeded: {
        type: Number,
        default: 1,
        min: 1
    },
    district: String,
    addedAt: {
        type: Date,
        default: Date.now
    },
    isNotified: {
        type: Boolean,
        default: false
    },
    notifiedAt: {
        type: Date
    },
    notificationRequested: {
        type: Boolean,
        default: false
    },
    notificationRequestedAt: {
        type: Date
    }
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['patient', 'nurse', 'manager', 'ministry_officer', 'admin', 'donor'],
        default: 'patient'
    },
    district: {
        type: String,
        required: [true, 'District is required']
    },
    hospital: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    watchlist: [watchlistItemSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    // Nurse-specific fields
    ward: {
        type: String,
        default: ''
    },
    wardNumber: {
        type: String,
        default: ''
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital'
    },
    hospitalName: {
        type: String,
        default: ''
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    this.updatedAt = new Date();
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);