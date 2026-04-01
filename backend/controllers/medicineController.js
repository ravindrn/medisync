const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Hospital = require('../models/Hospital'); // Add this import
const { sendStockUpdateNotification } = require('../services/emailService');

// Helper function to get stock status
const getStockStatus = (quantity) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 10) return 'Critical';
    if (quantity < 50) return 'Low Stock';
    return 'Available';
};

// @desc    Search medicines with tags and district filter
// @route   POST /api/medicines/search
const searchMedicines = async (req, res) => {
    try {
        console.log('=== SEARCH REQUEST RECEIVED ===');
        console.log('Request body:', req.body);
        
        const { tags, district } = req.body;
        
        if (!tags || tags.length === 0) {
            return res.status(400).json({ message: 'At least one search tag is required' });
        }

        if (!district) {
            return res.status(400).json({ message: 'District selection is required' });
        }

        console.log(`Searching for tags: ${tags.join(', ')} in district: ${district}`);

        // Create regex patterns for each tag (case insensitive)
        const regexPatterns = tags.map(tag => new RegExp(`^${tag}`, 'i'));
        
        // Find all medicines that match ANY of the tags
        const allMedicines = await Medicine.find({
            medicineName: { $in: regexPatterns }
        });

        console.log(`Found ${allMedicines.length} total medicine entries matching tags`);

        // Group medicines by name and strength
        const medicineMap = new Map();
        
        for (const medicine of allMedicines) {
            const medicineKey = `${medicine.medicineName.toLowerCase()}_${medicine.weight}_${medicine.unit}`;
            
            if (!medicineMap.has(medicineKey)) {
                // Filter stocks in the selected district
                let districtStocks = medicine.stocks.filter(stock => 
                    stock.district === district
                );
                
                // For each hospital, take ONLY the latest stock entry
                const hospitalLatestMap = new Map();
                
                districtStocks.forEach(stock => {
                    if (stock.hospitalId) {
                        const hospitalId = stock.hospitalId.toString();
                        const existing = hospitalLatestMap.get(hospitalId);
                        
                        if (!existing || new Date(stock.lastUpdated) > new Date(existing.lastUpdated)) {
                            hospitalLatestMap.set(hospitalId, stock);
                        }
                    } else {
                        // If no hospitalId, use hospitalName as key
                        const hospitalKey = stock.hospitalName || 'unknown';
                        const existing = hospitalLatestMap.get(hospitalKey);
                        
                        if (!existing || new Date(stock.lastUpdated) > new Date(existing.lastUpdated)) {
                            hospitalLatestMap.set(hospitalKey, stock);
                        }
                    }
                });
                
                // Convert map to array and filter out zero stock
                districtStocks = Array.from(hospitalLatestMap.values()).filter(stock => stock.availableQuantity > 0);
                
                const hasStock = districtStocks.length > 0;
                const totalAvailable = districtStocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
                
                medicineMap.set(medicineKey, {
                    _id: medicine._id,
                    medicineName: medicine.medicineName,
                    weight: medicine.weight,
                    unit: medicine.unit,
                    hasStockInDistrict: hasStock,
                    stocks: districtStocks,
                    totalAvailable: totalAvailable,
                    allStocks: medicine.stocks
                });
            } else {
                // If medicine already exists, merge stocks with latest only
                const existing = medicineMap.get(medicineKey);
                const districtStocks = medicine.stocks.filter(stock => 
                    stock.district === district
                );
                
                // For each hospital, take ONLY the latest stock entry
                const hospitalLatestMap = new Map();
                districtStocks.forEach(stock => {
                    if (stock.hospitalId) {
                        const hospitalId = stock.hospitalId.toString();
                        const existingStock = hospitalLatestMap.get(hospitalId);
                        
                        if (!existingStock || new Date(stock.lastUpdated) > new Date(existingStock.lastUpdated)) {
                            hospitalLatestMap.set(hospitalId, stock);
                        }
                    } else {
                        const hospitalKey = stock.hospitalName || 'unknown';
                        const existingStock = hospitalLatestMap.get(hospitalKey);
                        
                        if (!existingStock || new Date(stock.lastUpdated) > new Date(existingStock.lastUpdated)) {
                            hospitalLatestMap.set(hospitalKey, stock);
                        }
                    }
                });
                
                const latestStocks = Array.from(hospitalLatestMap.values()).filter(stock => stock.availableQuantity > 0);
                
                if (latestStocks.length > 0) {
                    // Merge stocks, avoiding duplicates
                    const existingStocksMap = new Map();
                    existing.stocks.forEach(stock => {
                        const key = stock.hospitalId ? stock.hospitalId.toString() : (stock.hospitalName || 'unknown');
                        existingStocksMap.set(key, stock);
                    });
                    
                    latestStocks.forEach(stock => {
                        const key = stock.hospitalId ? stock.hospitalId.toString() : (stock.hospitalName || 'unknown');
                        if (!existingStocksMap.has(key)) {
                            existing.stocks.push(stock);
                            existing.totalAvailable += stock.availableQuantity;
                        }
                    });
                    existing.hasStockInDistrict = true;
                }
                existing.allStocks = [...existing.allStocks, ...medicine.stocks];
                medicineMap.set(medicineKey, existing);
            }
        }
        
        const formattedMedicines = Array.from(medicineMap.values());
        
        // Sort: Medicines with stock first, then alphabetically
        formattedMedicines.sort((a, b) => {
            if (a.hasStockInDistrict === b.hasStockInDistrict) {
                return a.medicineName.localeCompare(b.medicineName);
            }
            return a.hasStockInDistrict ? -1 : 1;
        });

        console.log(`Returning ${formattedMedicines.length} unique medicines (${formattedMedicines.filter(m => m.hasStockInDistrict).length} with stock in ${district})`);
        
        res.json(formattedMedicines);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all distinct districts for dropdown
// @route   GET /api/medicines/districts
const getDistricts = async (req, res) => {
    try {
        // Method 1: Get distinct districts from Medicine stocks
        let districts = await Medicine.distinct('stocks.district');
        
        // Filter out empty/null values
        districts = districts.filter(d => d && d.trim());
        
        console.log(`Found ${districts.length} districts from Medicine stocks:`, districts);
        
        // If no districts found from stocks, try from Hospital collection
        if (districts.length === 0) {
            console.log('No districts found in Medicine stocks, checking Hospital collection...');
            const hospitals = await Hospital.find({ isActive: true });
            districts = [...new Set(hospitals.map(h => h.district).filter(d => d && d.trim()))];
            console.log(`Found ${districts.length} districts from Hospitals:`, districts);
        }
        
        // If still no districts, use fallback Sri Lankan districts
        if (districts.length === 0) {
            console.log('No districts found, using fallback list');
            const fallbackDistricts = [
                'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
                'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
                'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
                'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
                'Monaragala', 'Ratnapura', 'Kegalle'
            ];
            return res.json(fallbackDistricts);
        }
        
        // Sort alphabetically
        districts.sort();
        res.json(districts);
    } catch (error) {
        console.error('Error fetching districts:', error);
        // Return fallback districts on error
        const fallbackDistricts = [
            'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
            'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
            'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
            'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
            'Monaragala', 'Ratnapura', 'Kegalle'
        ];
        res.json(fallbackDistricts);
    }
};

// @desc    Add medicine to watchlist
// @route   POST /api/medicines/watchlist
const addToWatchlist = async (req, res) => {
    try {
        const { medicineId, quantityNeeded } = req.body;
        const userId = req.user.id;

        console.log('Add to watchlist request:', { medicineId, quantityNeeded, userId });

        const medicine = await Medicine.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const user = await User.findById(userId);
        
        const alreadyExists = user.watchlist.find(item => 
            item.medicine.toString() === medicineId
        );

        if (alreadyExists) {
            return res.status(400).json({ message: 'Medicine already in watchlist' });
        }

        user.watchlist.push({
            medicine: medicineId,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            quantityNeeded: quantityNeeded || 1,
            district: user.district,
            isNotified: false,
            notifiedAt: null
        });

        await user.save();
        
        const updatedUser = await User.findById(userId).populate('watchlist.medicine');
        res.status(201).json(updatedUser.watchlist);
    } catch (error) {
        console.error('Add to watchlist error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's watchlist with current stock information
// @route   GET /api/medicines/watchlist
const getWatchlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log(`Fetching watchlist for user: ${user.email}, district: ${user.district}`);
        
        const enhancedWatchlist = await Promise.all(user.watchlist.map(async (item) => {
            const medicine = await Medicine.findById(item.medicine);
            
            if (!medicine) {
                console.log(`Medicine not found for item: ${item._id}`);
                return {
                    ...item.toObject(),
                    totalAvailable: 0,
                    stocks: [],
                    isAvailable: false
                };
            }
            
            const districtStocks = medicine.stocks.filter(stock => 
                stock.district === user.district && stock.availableQuantity > 0
            );
            
            const totalAvailable = districtStocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
            
            return {
                _id: item._id,
                medicineId: item.medicine,
                medicineName: item.medicineName || medicine.medicineName,
                weight: item.weight || medicine.weight,
                unit: item.unit || medicine.unit,
                quantityNeeded: item.quantityNeeded,
                district: item.district || user.district,
                addedAt: item.addedAt,
                totalAvailable: totalAvailable,
                stocks: districtStocks,
                isAvailable: totalAvailable > 0,
                isNotified: item.isNotified || false,
                notifiedAt: item.notifiedAt,
                status: totalAvailable >= item.quantityNeeded ? 'Sufficient Stock' : 
                        totalAvailable > 0 ? 'Low Stock' : 'Out of Stock'
            };
        }));
        
        console.log(`Returning ${enhancedWatchlist.length} watchlist items`);
        res.json(enhancedWatchlist);
    } catch (error) {
        console.error('Get watchlist error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update watchlist item quantity
// @route   PUT /api/medicines/watchlist/:itemId
const updateWatchlistItem = async (req, res) => {
    try {
        const { quantityNeeded } = req.body;
        const { itemId } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        
        const watchlistItem = user.watchlist.id(itemId);
        if (!watchlistItem) {
            return res.status(404).json({ message: 'Item not found in watchlist' });
        }

        watchlistItem.quantityNeeded = quantityNeeded;
        await user.save();
        
        res.json({ message: 'Quantity updated successfully' });
    } catch (error) {
        console.error('Update watchlist error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove from watchlist
// @route   DELETE /api/medicines/watchlist/:itemId
const removeFromWatchlist = async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        user.watchlist = user.watchlist.filter(item => 
            item._id.toString() !== itemId
        );
        
        await user.save();
        res.json({ message: 'Item removed from watchlist' });
    } catch (error) {
        console.error('Remove from watchlist error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Request notification for when medicine becomes available
// @route   POST /api/medicines/notify
const requestNotification = async (req, res) => {
    try {
        const { 
            medicineId, 
            medicineName, 
            weight, 
            unit, 
            district, 
            quantityNeeded 
        } = req.body;
        
        const userId = req.user.id;
        
        console.log('📧 Notification request received:', { 
            medicineId, 
            medicineName, 
            district, 
            quantityNeeded, 
            userId 
        });
        
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const watchlistItem = user.watchlist.find(item => 
            item.medicine && item.medicine.toString() === medicineId
        );
        
        if (!watchlistItem) {
            return res.status(404).json({ message: 'Medicine not in watchlist' });
        }
        
        watchlistItem.notificationRequested = true;
        watchlistItem.notificationRequestedAt = new Date();
        watchlistItem.isNotified = false;
        
        await user.save();
        
        console.log(`✅ Notification request recorded for user ${user.email} for ${medicineName}`);
        
        res.json({ 
            message: `✅ Request sent! You'll be notified when ${medicineName} becomes available.`,
            success: true
        });
    } catch (error) {
        console.error('Request notification error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get manager's own hospital stock
// @route   GET /api/medicines/my-hospital-stock
const getMyHospitalStock = async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log(`\n=== FETCHING MANAGER HOSPITAL STOCK ===`);
        console.log(`User ID: ${userId}`);
        
        // Find hospital managed by this user
        const hospital = await Hospital.findOne({ manager: userId });
        if (!hospital) {
            console.log(`❌ No hospital found for manager`);
            return res.status(404).json({ message: 'No hospital found for this manager' });
        }
        
        console.log(`✅ Found hospital: ${hospital.name}`);
        console.log(`Hospital ID: ${hospital._id}`);
        
        // Find all medicines that have this hospital in their stocks array
        const medicines = await Medicine.find({
            'stocks.hospitalId': hospital._id
        }).sort({ medicineName: 1 });
        
        console.log(`Found ${medicines.length} medicines for hospital ${hospital.name}`);
        
        // Format the stock data
        const hospitalStock = [];
        
        medicines.forEach(medicine => {
            const stockEntry = medicine.stocks.find(
                stock => stock.hospitalId && stock.hospitalId.toString() === hospital._id.toString()
            );
            
            if (stockEntry) {
                hospitalStock.push({
                    medicineId: medicine._id,
                    medicineName: medicine.medicineName,
                    genericName: medicine.genericName || '',
                    weight: medicine.weight,
                    unit: medicine.unit,
                    manufacturer: medicine.manufacturer || '',
                    availableQuantity: stockEntry.availableQuantity,
                    status: stockEntry.status,
                    lastUpdated: stockEntry.lastUpdated
                });
                console.log(`  - ${medicine.medicineName}: ${stockEntry.availableQuantity} units`);
            }
        });
        
        // Calculate statistics
        const totalStock = hospitalStock.reduce((sum, m) => sum + m.availableQuantity, 0);
        const lowStockCount = hospitalStock.filter(m => m.availableQuantity < 50 && m.availableQuantity > 0).length;
        const criticalCount = hospitalStock.filter(m => m.availableQuantity < 10 && m.availableQuantity > 0).length;
        const outOfStockCount = hospitalStock.filter(m => m.availableQuantity === 0).length;
        
        console.log(`\n📊 Summary:`);
        console.log(`  Total medicines: ${hospitalStock.length}`);
        console.log(`  Total stock units: ${totalStock}`);
        
        res.json({
            hospital: {
                _id: hospital._id,
                id: hospital._id,
                name: hospital.name,
                district: hospital.district,
                address: hospital.address,
                phone: hospital.phone || '', // Include the phone number
                email: hospital.email
            },
            stock: hospitalStock,
            totalMedicines: hospitalStock.length,
            totalStock: totalStock,
            lowStockCount: lowStockCount,
            criticalCount: criticalCount,
            outOfStockCount: outOfStockCount
        });
    } catch (error) {
        console.error('Get my hospital stock error:', error);
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get hospital stock by ID
// @route   GET /api/medicines/hospital/:hospitalId/stock
const getHospitalStock = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const hospital = await Hospital.findById(hospitalId);
        
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        
        const medicines = await Medicine.find({
            'stocks.hospitalId': hospitalId
        }).sort({ medicineName: 1 });
        
        const stock = medicines.map(medicine => {
            const stockEntry = medicine.stocks.find(s => s.hospitalId.toString() === hospitalId);
            return {
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                genericName: medicine.genericName || '',
                weight: medicine.weight,
                unit: medicine.unit,
                manufacturer: medicine.manufacturer || '',
                availableQuantity: stockEntry?.availableQuantity || 0,
                status: stockEntry?.status || 'Out of Stock',
                lastUpdated: stockEntry?.lastUpdated
            };
        }).filter(m => m.availableQuantity > 0);
        
        res.json({ stock });
    } catch (error) {
        console.error('Get hospital stock error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all hospitals with stock
// @route   GET /api/medicines/hospitals-with-stock
const getHospitalsWithStock = async (req, res) => {
    try {
        const hospitals = await Hospital.find({ isActive: true });
        
        const hospitalData = await Promise.all(hospitals.map(async (hospital) => {
            const medicines = await Medicine.find({
                'stocks.hospitalId': hospital._id
            });
            
            const totalItems = medicines.length;
            const totalStock = medicines.reduce((sum, med) => {
                const stock = med.stocks.find(s => s.hospitalId.toString() === hospital._id.toString());
                return sum + (stock?.availableQuantity || 0);
            }, 0);
            const lowStockCount = medicines.filter(med => {
                const stock = med.stocks.find(s => s.hospitalId.toString() === hospital._id.toString());
                return stock && (stock.availableQuantity < 50 && stock.availableQuantity > 0);
            }).length;
            
            return {
                _id: hospital._id,
                name: hospital.name,
                district: hospital.district,
                stats: { totalItems, totalStock, lowStockCount }
            };
        }));
        
        res.json(hospitalData);
    } catch (error) {
        console.error('Get hospitals with stock error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search medicines across hospitals
// @route   GET /api/medicines/search-across
const searchMedicinesAcrossHospitals = async (req, res) => {
    try {
        const { searchTerm, district, hospitalId } = req.query;
        
        let query = {};
        if (searchTerm) {
            query.medicineName = { $regex: searchTerm, $options: 'i' };
        }
        
        let medicines = await Medicine.find(query).sort({ medicineName: 1 });
        
        medicines = medicines.map(medicine => {
            let filteredStocks = medicine.stocks;
            
            if (district) {
                filteredStocks = filteredStocks.filter(stock => stock.district === district);
            }
            if (hospitalId) {
                filteredStocks = filteredStocks.filter(stock => stock.hospitalId.toString() === hospitalId);
            }
            
            filteredStocks = filteredStocks.filter(stock => stock.availableQuantity > 0);
            
            if (filteredStocks.length === 0) return null;
            
            return {
                medicineId: medicine._id,
                medicineName: medicine.medicineName,
                weight: medicine.weight,
                unit: medicine.unit,
                stocks: filteredStocks.map(stock => ({
                    hospitalId: stock.hospitalId,
                    hospitalName: stock.hospitalName,
                    district: stock.district,
                    availableQuantity: stock.availableQuantity,
                    status: stock.status
                }))
            };
        }).filter(m => m !== null);
        
        res.json({ medicines });
    } catch (error) {
        console.error('Search medicines across hospitals error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get districts with hospitals
// @route   GET /api/medicines/districts-with-hospitals
const getDistrictsWithHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find({ isActive: true }).select('name district');
        
        const districtsMap = new Map();
        hospitals.forEach(hospital => {
            if (!districtsMap.has(hospital.district)) {
                districtsMap.set(hospital.district, []);
            }
            districtsMap.get(hospital.district).push({
                id: hospital._id,
                name: hospital.name
            });
        });
        
        const districts = Array.from(districtsMap.entries()).map(([district, hospitals]) => ({
            district,
            hospitals,
            hospitalCount: hospitals.length
        })).sort((a, b) => a.district.localeCompare(b.district));
        
        res.json(districts);
    } catch (error) {
        console.error('Get districts with hospitals error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get medicine stock across hospitals
// @route   GET /api/medicines/:id/stock-across
const getMedicineStockAcrossHospitals = async (req, res) => {
    try {
        const { id } = req.params;
        
        const medicine = await Medicine.findById(id);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }
        
        const stocksWithHospitals = await Promise.all(medicine.stocks.map(async (stock) => {
            const hospital = await Hospital.findById(stock.hospitalId);
            return {
                hospitalId: stock.hospitalId,
                hospitalName: stock.hospitalName,
                hospitalDistrict: hospital?.district || stock.district,
                availableQuantity: stock.availableQuantity,
                status: stock.status
            };
        }));
        
        res.json({
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            stocks: stocksWithHospitals.filter(s => s.availableQuantity > 0),
            totalAvailable: stocksWithHospitals.reduce((sum, s) => sum + s.availableQuantity, 0)
        });
    } catch (error) {
        console.error('Get medicine stock across hospitals error:', error);
        res.status(500).json({ message: error.message });
    }
};

// ==================== MODULE EXPORTS ====================
module.exports = {
    searchMedicines,
    getDistricts,
    addToWatchlist,
    getWatchlist,
    updateWatchlistItem,
    removeFromWatchlist,
    requestNotification,
    getMyHospitalStock,
    getHospitalStock,
    getHospitalsWithStock,
    searchMedicinesAcrossHospitals,
    getDistrictsWithHospitals,
    getMedicineStockAcrossHospitals
};