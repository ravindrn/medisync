const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Check if admin already exists
        const adminExists = await User.findOne({ email: 'admin@medisync.com' });
        if (adminExists) {
            console.log('✅ Admin user already exists!');
            console.log('📧 Email: admin@medisync.com');
            console.log('🔑 Password: Admin@123');
            console.log('👑 Role: admin');
            process.exit();
        }
        
        // Create admin user
        const admin = await User.create({
            name: 'System Administrator',
            email: 'admin@medisync.com',
            password: 'Admin@123',
            district: 'Colombo',
            role: 'admin'
        });
        
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email: admin@medisync.com');
        console.log('🔑 Password: Admin@123');
        console.log('👑 Role: admin');
        
        process.exit();
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();