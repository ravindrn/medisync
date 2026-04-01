const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Medicine = require('../models/Medicine');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        await Medicine.deleteMany({});
        
        console.log('Seeding medicine stock data...');
        
        const medicines = [
            // Paracetamol - Multiple weights
            {
                medicineName: "Paracetamol",
                weight: 500,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 1250 },
                    { hospitalName: "Teaching Hospital Peradeniya", district: "Kandy", availableQuantity: 890 },
                    { hospitalName: "General Hospital Galle", district: "Galle", availableQuantity: 567 },
                    { hospitalName: "General Hospital Jaffna", district: "Jaffna", availableQuantity: 432 }
                ]
            },
            {
                medicineName: "Paracetamol",
                weight: 250,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 800 },
                    { hospitalName: "General Hospital Kandy", district: "Kandy", availableQuantity: 450 },
                    { hospitalName: "General Hospital Ratnapura", district: "Ratnapura", availableQuantity: 234 }
                ]
            },
            // Amoxicillin - Multiple weights
            {
                medicineName: "Amoxicillin",
                weight: 500,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 543 },
                    { hospitalName: "General Hospital Badulla", district: "Badulla", availableQuantity: 123 },
                    { hospitalName: "General Hospital Kandy", district: "Kandy", availableQuantity: 234 }
                ]
            },
            {
                medicineName: "Amoxicillin",
                weight: 250,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 876 },
                    { hospitalName: "General Hospital Badulla", district: "Badulla", availableQuantity: 234 },
                    { hospitalName: "General Hospital Kandy", district: "Kandy", availableQuantity: 445 }
                ]
            },
            {
                medicineName: "Amoxicillin",
                weight: 125,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 321 },
                    { hospitalName: "Teaching Hospital Peradeniya", district: "Kandy", availableQuantity: 156 }
                ]
            },
            // Clopidogrel
            {
                medicineName: "Clopidogrel",
                weight: 75,
                unit: "mg",
                stocks: [
                    { hospitalName: "General Hospital Badulla", district: "Badulla", availableQuantity: 113 },
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 567 },
                    { hospitalName: "General Hospital Kandy", district: "Kandy", availableQuantity: 245 }
                ]
            },
            // Doxycycline
            {
                medicineName: "Doxycycline",
                weight: 100,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Puttalam", district: "Puttalam", availableQuantity: 38 },
                    { hospitalName: "General Hospital Kurunegala", district: "Kurunegala", availableQuantity: 156 }
                ]
            },
            // Metformin
            {
                medicineName: "Metformin",
                weight: 500,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 890 },
                    { hospitalName: "Teaching Hospital Peradeniya", district: "Kandy", availableQuantity: 678 },
                    { hospitalName: "General Hospital Galle", district: "Galle", availableQuantity: 345 }
                ]
            },
            // Atorvastatin
            {
                medicineName: "Atorvastatin",
                weight: 20,
                unit: "mg",
                stocks: [
                    { hospitalName: "National Hospital Colombo", district: "Colombo", availableQuantity: 432 },
                    { hospitalName: "General Hospital Jaffna", district: "Jaffna", availableQuantity: 98 }
                ]
            },
            // Omeprazole
            {
                medicineName: "Omeprazole",
                weight: 20,
                unit: "mg",
                stocks: [
                    { hospitalName: "General Hospital Kurunegala", district: "Kurunegala", availableQuantity: 267 },
                    { hospitalName: "Teaching Hospital Peradeniya", district: "Kandy", availableQuantity: 189 }
                ]
            }
        ];
        
        await Medicine.insertMany(medicines);
        
        console.log(`✅ Seeded ${medicines.length} medicine records`);
        
        // Display summary
        const stats = await Medicine.aggregate([
            { $group: { _id: "$medicineName", count: { $sum: 1 }, weights: { $addToSet: "$weight" } } }
        ]);
        
        console.log("\n📊 Medicine Summary:");
        stats.forEach(med => {
            console.log(`   - ${med._id}: ${med.count} weight variations (${med.weights.sort().join(', ')}${med.weights[0] ? 'mg' : ''})`);
        });
        
        const availableDistricts = await Medicine.distinct('stocks.district');
        console.log("\n🏥 Districts with Stock Data:");
        availableDistricts.sort().forEach(d => console.log(`   - ${d}`));
        
        console.log("\n💡 Tip: When registering, you can choose any district. Search results will show medicines available in your selected district.");
        
        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();