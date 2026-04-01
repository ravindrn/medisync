const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Medicine = require('../models/Medicine');
const fs = require('fs');
const path = require('path');

dotenv.config();

const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Clear existing data
        await Medicine.deleteMany({});
        console.log('Cleared existing medicine data');
        
        // Read the JSON file
        const rawData = fs.readFileSync(path.join(__dirname, 'medicines_1000.json'), 'utf8');
        const medicinesData = JSON.parse(rawData);
        
        console.log(`Found ${medicinesData.length} records in JSON file`);
        
        // Group data by medicine name and weight
        const groupedMedicines = new Map();
        
        medicinesData.forEach(record => {
            // Skip if status is "Unavailable"
            if (record.status === 'Unavailable') return;
            
            const key = `${record.medicineName}_${record.weight}_${record.unit}`;
            
            if (!groupedMedicines.has(key)) {
                groupedMedicines.set(key, {
                    medicineName: record.medicineName,
                    weight: record.weight,
                    unit: record.unit,
                    stocks: []
                });
            }
            
            const medicine = groupedMedicines.get(key);
            medicine.stocks.push({
                hospitalName: record.hospitalName,
                district: record.district,
                availableQuantity: record.availableQuantity,
                status: record.status,
                lastUpdated: new Date()
            });
        });
        
        // Convert to array and insert
        const medicinesToInsert = Array.from(groupedMedicines.values());
        
        // Add status for each stock based on quantity
        medicinesToInsert.forEach(medicine => {
            medicine.stocks.forEach(stock => {
                if (stock.availableQuantity <= 0) {
                    stock.status = 'Out of Stock';
                } else if (stock.availableQuantity < 50) {
                    stock.status = 'Low Stock';
                } else {
                    stock.status = 'Available';
                }
            });
        });
        
        console.log(`Grouped into ${medicinesToInsert.length} unique medicine+weight combinations`);
        
        // Insert into database
        await Medicine.insertMany(medicinesToInsert);
        
        console.log('✅ Data imported successfully!');
        
        // Show summary
        console.log('\n📊 Summary:');
        console.log(`Total unique medicines: ${medicinesToInsert.length}`);
        
        // Show all districts with data
        const districts = await Medicine.distinct('stocks.district');
        console.log(`\n🏥 Districts with stock data: ${districts.length}`);
        districts.sort().forEach(d => console.log(`   - ${d}`));
        
        // Show medicine count by district
        const medicineCountByDistrict = await Medicine.aggregate([
            { $unwind: "$stocks" },
            { $group: { _id: "$stocks.district", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        console.log('\n📈 Medicine stock count by district:');
        medicineCountByDistrict.forEach(item => {
            console.log(`   - ${item._id}: ${item.count} stock records`);
        });
        
        process.exit();
    } catch (error) {
        console.error('Error importing data:', error);
        process.exit(1);
    }
};

importData();