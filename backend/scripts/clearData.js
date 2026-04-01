const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Medicine = require('../models/Medicine');
const Hospital = require('../models/Hospital');
const User = require('../models/User');

dotenv.config();

const clearData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Clear all collections
        await Hospital.deleteMany({});
        await Medicine.deleteMany({});
        await User.deleteMany({});
        
        console.log('All data cleared successfully');
        process.exit();
    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearData();