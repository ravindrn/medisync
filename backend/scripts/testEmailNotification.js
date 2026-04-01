const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Medicine = require('../models/Medicine');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail, createStockNotificationEmail } = require('../config/email');

dotenv.config();

const testEmailNotification = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        console.log('📧 Testing Email Notification System...\n');
        
        // Get a test user
        const testUser = await User.findOne({ email: { $ne: 'admin@medisync.com' } });
        if (!testUser) {
            console.log('❌ No test user found. Please register a regular user first.');
            process.exit();
        }
        
        console.log(`👤 Test User: ${testUser.name} (${testUser.email})`);
        
        // Get a test medicine
        const testMedicine = await Medicine.findOne();
        if (!testMedicine) {
            console.log('❌ No medicine found in database.');
            process.exit();
        }
        
        console.log(`💊 Test Medicine: ${testMedicine.medicineName} ${testMedicine.weight}${testMedicine.unit}`);
        
        // Get a test stock
        const testStock = testMedicine.stocks[0];
        if (!testStock) {
            console.log('❌ No stock entry found.');
            process.exit();
        }
        
        console.log(`🏥 Hospital: ${testStock.hospitalName}`);
        console.log(`📍 District: ${testStock.district}`);
        console.log(`📦 Current Stock: ${testStock.availableQuantity} units\n`);
        
        // Create a test notification
        const testNotification = await Notification.create({
            user: testUser._id,
            medicine: testMedicine._id,
            medicineName: testMedicine.medicineName,
            weight: testMedicine.weight,
            unit: testMedicine.unit,
            district: testStock.district,
            hospitalName: testStock.hospitalName,
            status: 'pending'
        });
        
        console.log('✅ Test notification created!');
        
        // Create email content
        const stockInfo = {
            hospitalName: testStock.hospitalName,
            district: testStock.district,
            availableQuantity: testStock.availableQuantity,
            lastUpdated: testStock.lastUpdated
        };
        
        const emailHtml = createStockNotificationEmail(
            testUser.name,
            {
                medicineName: testMedicine.medicineName,
                weight: testMedicine.weight,
                unit: testMedicine.unit
            },
            stockInfo
        );
        
        // Send test email
        console.log('\n📧 Sending test email...');
        const result = await sendEmail(
            testUser.email,
            `🧪 Test: ${testMedicine.medicineName} Stock Update Notification`,
            emailHtml
        );
        
        if (result.success) {
            console.log('\n✅ Test email sent successfully!');
            if (result.previewUrl) {
                console.log('📧 Preview URL:', result.previewUrl);
                console.log('\n💡 Open the preview URL to see the email in your browser.');
            }
        } else {
            console.error('\n❌ Failed to send email:', result.error);
        }
        
        // Clean up
        await Notification.findByIdAndDelete(testNotification._id);
        console.log('\n🧹 Test notification cleaned up.');
        
        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

testEmailNotification();