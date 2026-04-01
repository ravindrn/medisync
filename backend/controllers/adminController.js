const Medicine = require('../models/Medicine');
const User = require('../models/User');
const Hospital = require('../models/Hospital');
const StockUpdateHistory = require('../models/StockUpdateHistory');
const TransferHistory = require('../models/TransferHistory');
const { sendStockUpdateNotification } = require('../services/emailService');

// Helper function to update hospital stats
const updateHospitalStats = async (hospitalId) => {
    try {
        const medicines = await Medicine.find({
            'stocks.hospitalId': hospitalId
        });
        
        let totalMedicines = 0;
        let totalStock = 0;
        let lowStockCount = 0;
        
        medicines.forEach(medicine => {
            const stockEntry = medicine.stocks.find(s => 
                s.hospitalId && s.hospitalId.toString() === hospitalId.toString()
            );
            if (stockEntry) {
                totalMedicines++;
                totalStock += stockEntry.availableQuantity;
                if (stockEntry.availableQuantity < 50 && stockEntry.availableQuantity > 0) {
                    lowStockCount++;
                }
            }
        });
        
        await Hospital.updateOne(
            { _id: hospitalId },
            { 
                $set: { 
                    "stats.totalMedicines": totalMedicines,
                    "stats.totalStock": totalStock,
                    "stats.lowStockCount": lowStockCount,
                    "stats.lastUpdated": new Date()
                } 
            }
        );
        
        return true;
    } catch (error) {
        console.error('Error updating hospital stats:', error);
        return false;
    }
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/stats
const getStats = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const totalMedicines = await Medicine.countDocuments();
        const totalUsers = await User.countDocuments();
        
        // Get stock statistics
        const allMedicines = await Medicine.find();
        
        let totalStockEntries = 0;
        let totalUnits = 0;
        let lowStockCount = 0;
        let criticalCount = 0;
        let outOfStockCount = 0;
        
        const lowStockItems = [];
        
        allMedicines.forEach(medicine => {
            totalStockEntries += medicine.stocks.length;
            
            medicine.stocks.forEach(stock => {
                totalUnits += stock.availableQuantity;
                
                if (stock.availableQuantity === 0) {
                    outOfStockCount++;
                } else if (stock.availableQuantity < 10) {
                    criticalCount++;
                    lowStockItems.push({
                        medicineName: medicine.medicineName,
                        weight: medicine.weight,
                        unit: medicine.unit,
                        hospitalName: stock.hospitalName,
                        district: stock.district,
                        quantity: stock.availableQuantity,
                        status: 'Critical'
                    });
                } else if (stock.availableQuantity < 50) {
                    lowStockCount++;
                    lowStockItems.push({
                        medicineName: medicine.medicineName,
                        weight: medicine.weight,
                        unit: medicine.unit,
                        hospitalName: stock.hospitalName,
                        district: stock.district,
                        quantity: stock.availableQuantity,
                        status: 'Low Stock'
                    });
                }
            });
        });

        // Get pending notifications count - CORRECTED
        let pendingNotifications = 0;
        
        const usersWithNotifications = await User.find({
            'watchlist.notificationRequested': true,
            'watchlist.isNotified': false
        });
        
        console.log(`Found ${usersWithNotifications.length} users with notification requests`);
        
        for (const user of usersWithNotifications) {
            for (const item of user.watchlist) {
                if (item.notificationRequested === true && item.isNotified === false) {
                    const medicine = await Medicine.findById(item.medicine);
                    if (medicine) {
                        const totalAvailable = medicine.stocks
                            .filter(stock => stock.district === user.district)
                            .reduce((sum, stock) => sum + stock.availableQuantity, 0);
                        
                        if (totalAvailable < item.quantityNeeded) {
                            pendingNotifications++;
                            console.log(`  Pending: ${user.name} - ${item.medicineName} (needs ${item.quantityNeeded}, has ${totalAvailable})`);
                        } else {
                            console.log(`  Fulfilled: ${user.name} - ${item.medicineName} (needs ${item.quantityNeeded}, has ${totalAvailable})`);
                        }
                    }
                }
            }
        }

        console.log(`Total pending notifications: ${pendingNotifications}`);

        // Get admin stock updates
        let adminUpdates = [];
        try {
            adminUpdates = await StockUpdateHistory.find()
                .sort({ updatedAt: -1 })
                .limit(10)
                .lean();
            console.log('Admin updates found:', adminUpdates.length);
        } catch (err) {
            console.error('Error fetching StockUpdateHistory:', err.message);
            adminUpdates = [];
        }

        const formattedAdminUpdates = adminUpdates.map(update => ({
            medicineName: update.medicineName,
            weight: update.weight,
            unit: update.unit,
            hospitalName: update.hospitalName,
            district: update.district,
            changeAmount: update.changeAmount,
            updatedBy: update.updatedBy || { name: 'System' },
            updatedAt: update.updatedAt,
            type: 'admin'
        }));

        // Get transfer updates - FIXED to handle the actual database structure
        let transferUpdates = [];
        try {
            transferUpdates = await TransferHistory.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();
            console.log('Transfer updates found:', transferUpdates.length);
        } catch (err) {
            console.error('Error fetching TransferHistory:', err.message);
            transferUpdates = [];
        }

        // FIXED: Properly format transfer updates based on actual database structure
        const formattedTransferUpdates = transferUpdates.map(transfer => {
            // Get medicine details from medicines array or direct fields
            let medicineName = '';
            let weight = '';
            let unit = '';
            let quantity = 0;
            
            if (transfer.medicines && transfer.medicines.length > 0) {
                // Get first medicine (for display purposes)
                const firstMedicine = transfer.medicines[0];
                medicineName = firstMedicine.medicineName || 'Unknown';
                weight = firstMedicine.weight || '';
                unit = firstMedicine.unit || '';
                quantity = firstMedicine.approvedQuantity || firstMedicine.requestedQuantity || 0;
            } else if (transfer.medicineName) {
                // Fallback to direct fields
                medicineName = transfer.medicineName;
                weight = transfer.weight || '';
                unit = transfer.unit || '';
                quantity = transfer.quantity || 0;
            }
            
            return {
                medicineName: medicineName,
                weight: weight,
                unit: unit,
                fromHospital: transfer.fromHospital?.name || 'Unknown',
                toHospital: transfer.toHospital?.name || 'Unknown',
                quantity: quantity,
                type: transfer.type || 'request',
                status: transfer.status || 'pending',
                createdAt: transfer.createdAt || transfer.completedAt || transfer.updatedAt
            };
        });

        const responseData = {
            totalMedicines,
            totalUsers,
            totalStockEntries,
            totalUnits,
            lowStockCount,
            criticalCount,
            outOfStockCount,
            pendingNotifications,
            lowStockItems: lowStockItems.slice(0, 10),
            adminUpdates: formattedAdminUpdates,
            transferUpdates: formattedTransferUpdates
        };

        console.log('📊 Dashboard Statistics:');
        console.log(`  - Total Medicines: ${totalMedicines}`);
        console.log(`  - Stock Entries: ${totalStockEntries}`);
        console.log(`  - Total Units: ${totalUnits}`);
        console.log(`  - Pending Notifications: ${pendingNotifications}`);
        console.log(`  - Transfer Updates: ${formattedTransferUpdates.length}`);
        console.log(`  - Sample transfer:`, formattedTransferUpdates[0]);

        res.json(responseData);
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: error.message });
    }
};
// @desc    Get all medicines
// @route   GET /api/admin/medicines
const getAllMedicines = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const medicines = await Medicine.find().sort({ medicineName: 1 });
        res.json(medicines);
    } catch (error) {
        console.error('Get all medicines error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add new medicine stock
// @route   POST /api/admin/medicines
const addMedicine = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { medicineName, weight, unit, stocks } = req.body;

        if (!medicineName || !weight || !unit || !stocks || stocks.length === 0) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        let medicine = await Medicine.findOne({ 
            medicineName: medicineName,
            weight: weight,
            unit: unit
        });

        const notificationsSent = [];

        if (medicine) {
            for (const newStock of stocks) {
                const existingStock = medicine.stocks.find(s => 
                    s.hospitalName === newStock.hospitalName && 
                    s.district === newStock.district
                );

                if (existingStock) {
                    const oldQuantity = existingStock.availableQuantity;
                    existingStock.availableQuantity += newStock.availableQuantity;
                    existingStock.lastUpdated = new Date();
                    
                    // Log stock update
                    await StockUpdateHistory.create({
                        medicineId: medicine._id,
                        medicineName: medicine.medicineName,
                        weight: medicine.weight,
                        unit: medicine.unit,
                        hospitalName: newStock.hospitalName,
                        district: newStock.district,
                        oldQuantity: oldQuantity,
                        newQuantity: existingStock.availableQuantity,
                        changeAmount: newStock.availableQuantity,
                        updatedBy: {
                            id: req.user.id,
                            name: req.user.name,
                            email: req.user.email
                        },
                        updatedAt: new Date()
                    });
                    
                    // Send notifications if stock increased
                    if (newStock.availableQuantity > 0) {
                        const usersToNotify = await User.find({
                            'watchlist.medicine': medicine._id,
                            'watchlist.district': newStock.district,
                            'watchlist.notificationRequested': true,
                            'watchlist.isNotified': false
                        });
                        
                        for (const user of usersToNotify) {
                            const watchlistItem = user.watchlist.find(item => 
                                item.medicine.toString() === medicine._id.toString() && 
                                item.district === newStock.district
                            );
                            
                            if (watchlistItem && existingStock.availableQuantity >= watchlistItem.quantityNeeded) {
                                try {
                                    await sendStockUpdateNotification(
                                        user.email,
                                        user.name,
                                        medicine.medicineName,
                                        `${medicine.weight}${medicine.unit}`,
                                        newStock.hospitalName,
                                        newStock.district,
                                        existingStock.availableQuantity
                                    );
                                    
                                    watchlistItem.isNotified = true;
                                    watchlistItem.notifiedAt = new Date();
                                    watchlistItem.notificationRequested = false;
                                    await user.save();
                                    notificationsSent.push(user.email);
                                } catch (emailError) {
                                    console.error('Email error:', emailError);
                                }
                            }
                        }
                    }
                } else {
                    medicine.stocks.push({
                        ...newStock,
                        lastUpdated: new Date()
                    });
                    
                    // Log stock addition
                    await StockUpdateHistory.create({
                        medicineId: medicine._id,
                        medicineName: medicine.medicineName,
                        weight: medicine.weight,
                        unit: medicine.unit,
                        hospitalName: newStock.hospitalName,
                        district: newStock.district,
                        oldQuantity: 0,
                        newQuantity: newStock.availableQuantity,
                        changeAmount: newStock.availableQuantity,
                        updatedBy: {
                            id: req.user.id,
                            name: req.user.name,
                            email: req.user.email
                        },
                        updatedAt: new Date()
                    });
                    
                    if (newStock.availableQuantity > 0) {
                        const usersToNotify = await User.find({
                            'watchlist.medicine': medicine._id,
                            'watchlist.district': newStock.district,
                            'watchlist.notificationRequested': true,
                            'watchlist.isNotified': false
                        });
                        
                        for (const user of usersToNotify) {
                            const watchlistItem = user.watchlist.find(item => 
                                item.medicine.toString() === medicine._id.toString() && 
                                item.district === newStock.district
                            );
                            
                            if (watchlistItem && newStock.availableQuantity >= watchlistItem.quantityNeeded) {
                                try {
                                    await sendStockUpdateNotification(
                                        user.email,
                                        user.name,
                                        medicine.medicineName,
                                        `${medicine.weight}${medicine.unit}`,
                                        newStock.hospitalName,
                                        newStock.district,
                                        newStock.availableQuantity
                                    );
                                    
                                    watchlistItem.isNotified = true;
                                    watchlistItem.notifiedAt = new Date();
                                    watchlistItem.notificationRequested = false;
                                    await user.save();
                                    notificationsSent.push(user.email);
                                } catch (emailError) {
                                    console.error('Email error:', emailError);
                                }
                            }
                        }
                    }
                }
            }

            await medicine.save();
            
            res.status(200).json({ 
                message: `Stock added/updated successfully. ${notificationsSent.length} notifications sent.`,
                medicine,
                notificationsSent: notificationsSent.length
            });
        } else {
            medicine = await Medicine.create({
                medicineName,
                weight: parseFloat(weight),
                unit,
                stocks: stocks.map(stock => ({
                    ...stock,
                    lastUpdated: new Date()
                }))
            });

            // Log initial stock addition
            for (const stock of stocks) {
                await StockUpdateHistory.create({
                    medicineId: medicine._id,
                    medicineName: medicine.medicineName,
                    weight: medicine.weight,
                    unit: medicine.unit,
                    hospitalName: stock.hospitalName,
                    district: stock.district,
                    oldQuantity: 0,
                    newQuantity: stock.availableQuantity,
                    changeAmount: stock.availableQuantity,
                    updatedBy: {
                        id: req.user.id,
                        name: req.user.name,
                        email: req.user.email
                    },
                    updatedAt: new Date()
                });
            }

            res.status(201).json({ 
                message: 'New medicine added successfully',
                medicine
            });
        }
    } catch (error) {
        console.error('Add medicine error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update medicine stock
// @route   PUT /api/admin/medicines/:id/stock
const updateStock = async (req, res) => {
    try {
        const { hospitalName, district, newQuantity } = req.body;
        const medicineId = req.params.id;

        console.log('=== UPDATE STOCK REQUEST ===');
        console.log('Medicine ID:', medicineId);
        console.log('Hospital:', hospitalName);
        console.log('District:', district);
        console.log('New Quantity:', newQuantity);

        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const medicine = await Medicine.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        const stockEntry = medicine.stocks.find(stock => 
            stock.hospitalName === hospitalName && stock.district === district
        );

        if (!stockEntry) {
            return res.status(404).json({ message: 'Stock entry not found' });
        }

        const oldQuantity = stockEntry.availableQuantity;
        stockEntry.availableQuantity = parseInt(newQuantity);
        stockEntry.lastUpdated = new Date();
        stockEntry.updatedBy = req.user.id;
        
        await medicine.save();

        // Log this update in the history collection
        await StockUpdateHistory.create({
            medicineId: medicine._id,
            medicineName: medicine.medicineName,
            weight: medicine.weight,
            unit: medicine.unit,
            hospitalName: hospitalName,
            district: district,
            oldQuantity: oldQuantity,
            newQuantity: parseInt(newQuantity),
            changeAmount: parseInt(newQuantity) - oldQuantity,
            updatedBy: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email
            },
            updatedAt: new Date()
        });

        const notificationsSent = [];

        // Send notifications if stock increased and meets user needs
        if (newQuantity > oldQuantity) {
            const usersToNotify = await User.find({
                'watchlist.medicine': medicineId,
                'watchlist.district': district,
                'watchlist.notificationRequested': true,
                'watchlist.isNotified': false
            });

            for (const user of usersToNotify) {
                const watchlistItem = user.watchlist.find(item => 
                    item.medicine.toString() === medicineId.toString() && 
                    item.district === district
                );
                
                if (watchlistItem && newQuantity >= watchlistItem.quantityNeeded) {
                    try {
                        await sendStockUpdateNotification(
                            user.email,
                            user.name,
                            medicine.medicineName,
                            `${medicine.weight}${medicine.unit}`,
                            hospitalName,
                            district,
                            newQuantity
                        );
                        
                        watchlistItem.isNotified = true;
                        watchlistItem.notifiedAt = new Date();
                        watchlistItem.notificationRequested = false;
                        await user.save();
                        
                        notificationsSent.push(user.email);
                    } catch (emailError) {
                        console.error(`Failed to send email to ${user.email}:`, emailError);
                    }
                }
            }
        }

        // Update hospital stats
        const hospital = await Hospital.findOne({ name: hospitalName, district: district });
        if (hospital) {
            await updateHospitalStats(hospital._id);
        }

        res.json({ 
            message: `Stock updated successfully. ${notificationsSent.length} notification(s) sent.`,
            oldQuantity, 
            newQuantity,
            notificationsSent: notificationsSent.length
        });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update medicine
// @route   PUT /api/admin/medicines/:id
const updateMedicine = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const medicine = await Medicine.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        res.json(medicine);
    } catch (error) {
        console.error('Update medicine error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete medicine
// @route   DELETE /api/admin/medicines/:id
const deleteMedicine = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const medicine = await Medicine.findByIdAndDelete(req.params.id);

        if (!medicine) {
            return res.status(404).json({ message: 'Medicine not found' });
        }

        res.json({ message: 'Medicine deleted successfully' });
    } catch (error) {
        console.error('Delete medicine error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all users with pagination and filters
// @route   GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { role, search, page = 1, limit = 20 } = req.query;
        const query = {};

        // Filter by role
        if (role && role !== 'all') {
            query.role = role;
        }

        // Search by name or email
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);

        res.json({
            users,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
const getUserById = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new user (admin)
// @route   POST /api/admin/users
const createUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { name, email, password, role, district, hospital, hospitalId, phone, ward, wardNumber } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        // Get hospital name if hospitalId is provided
        let hospitalName = '';
        if (hospitalId) {
            const hospitalObj = await Hospital.findById(hospitalId);
            if (hospitalObj) {
                hospitalName = hospitalObj.name;
            }
        } else if (hospital) {
            hospitalName = hospital;
        }

        // Create user with all fields
        const user = await User.create({
            name,
            email,
            password: password || 'password123',
            role: role || 'patient',
            district,
            phone: phone || '',
            hospitalId: hospitalId || null,
            hospitalName: hospitalName,
            hospital: hospital || '',
            ward: ward || '',
            wardNumber: wardNumber || '',
            isActive: true
        });

        // If user is a manager and hospital is selected, assign them as manager
        if (role === 'manager' && hospitalId) {
            const hospitalToUpdate = await Hospital.findById(hospitalId);
            if (hospitalToUpdate) {
                // Remove manager from previous hospital if any
                if (hospitalToUpdate.manager) {
                    const previousManager = await User.findById(hospitalToUpdate.manager);
                    if (previousManager) {
                        await User.updateOne(
                            { _id: hospitalToUpdate.manager },
                            { $set: { role: 'patient', hospital: '' } }
                        );
                    }
                }
                
                // Assign new manager
                await Hospital.updateOne(
                    { _id: hospitalId },
                    { 
                        $set: { 
                            manager: user._id,
                            phone: phone || hospitalToUpdate.phone
                        } 
                    }
                );
                
                // Update user with hospital info
                await User.updateOne(
                    { _id: user._id },
                    { $set: { hospital: hospitalToUpdate.name } }
                );
                
                console.log(`✅ Assigned ${user.name} as manager of ${hospitalToUpdate.name}`);
            }
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ message: error.message });
    }
};
// @desc    Update user
// @route   PUT /api/admin/users/:id
const updateUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { name, email, role, district, hospital, hospitalId, phone, ward, wardNumber, isActive } = req.body;
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get hospital name if hospitalId is provided
        let hospitalName = '';
        if (hospitalId) {
            const hospitalObj = await Hospital.findById(hospitalId);
            if (hospitalObj) {
                hospitalName = hospitalObj.name;
            }
        }

        // Store old role for comparison
        const oldRole = user.role;
        
        // Update fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (role) user.role = role;
        if (district) user.district = district;
        if (hospital !== undefined) user.hospital = hospital;
        if (phone !== undefined) user.phone = phone;
        if (isActive !== undefined) user.isActive = isActive;
        
        // Update nurse-specific fields
        if (role === 'nurse') {
            if (ward !== undefined) user.ward = ward;
            if (wardNumber !== undefined) user.wardNumber = wardNumber;
            if (hospitalId) user.hospitalId = hospitalId;
            if (hospitalName) user.hospitalName = hospitalName;
        }
        
        user.updatedAt = new Date();
        await user.save();

        // Handle hospital manager assignment
        if (role === 'manager') {
            if (hospitalId) {
                // Find the hospital
                const hospitalToUpdate = await Hospital.findById(hospitalId);
                if (hospitalToUpdate) {
                    // Remove manager from previous hospital if any
                    if (hospitalToUpdate.manager && hospitalToUpdate.manager.toString() !== user._id.toString()) {
                        const previousManager = await User.findById(hospitalToUpdate.manager);
                        if (previousManager) {
                            await User.updateOne(
                                { _id: hospitalToUpdate.manager },
                                { $set: { role: 'patient', hospital: '' } }
                            );
                        }
                    }
                    
                    // Assign new manager and update phone
                    await Hospital.updateOne(
                        { _id: hospitalId },
                        { 
                            $set: { 
                                manager: user._id,
                                phone: phone || hospitalToUpdate.phone
                            } 
                        }
                    );
                    
                    // Update user with hospital name
                    await User.updateOne(
                        { _id: user._id },
                        { $set: { hospital: hospitalToUpdate.name } }
                    );
                    
                    console.log(`✅ Assigned ${user.name} as manager of ${hospitalToUpdate.name}`);
                }
            } else if (user.hospital) {
                // If manager has hospital name but no ID, try to find by name
                const hospitalByName = await Hospital.findOne({ name: user.hospital });
                if (hospitalByName) {
                    await Hospital.updateOne(
                        { _id: hospitalByName._id },
                        { 
                            $set: { 
                                manager: user._id,
                                phone: phone || hospitalByName.phone
                            } 
                        }
                    );
                    console.log(`✅ Assigned ${user.name} as manager of ${hospitalByName.name} (by name)`);
                }
            }
        } else if (oldRole === 'manager') {
            // If user was a manager but now changed role, remove manager status
            const hospitalManaged = await Hospital.findOne({ manager: user._id });
            if (hospitalManaged) {
                await Hospital.updateOne(
                    { _id: hospitalManaged._id },
                    { $set: { manager: null } }
                );
                console.log(`✅ Removed manager status from ${user.name} for ${hospitalManaged.name}`);
            }
        }

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({
            message: 'User updated successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        // Prevent admin from deleting themselves
        if (req.params.id === req.user.id) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset user password
// @route   POST /api/admin/users/:id/reset-password
const resetUserPassword = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { newPassword } = req.body;
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword || 'password123';
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all pending notification requests
// @route   GET /api/admin/notifications
const getNotifications = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        // Find all users who have requested notifications
        const users = await User.find({ 
            watchlist: { 
                $elemMatch: { 
                    notificationRequested: true,
                    isNotified: false
                }
            }
        });

        const pendingNotifications = [];

        for (const user of users) {
            for (const item of user.watchlist) {
                // Only include items that have notification requested and not yet notified
                if (item.notificationRequested === true && item.isNotified === false) {
                    const medicine = await Medicine.findById(item.medicine);
                    
                    if (medicine) {
                        // Calculate current stock in user's district
                        const districtStocks = medicine.stocks.filter(stock => 
                            stock.district === user.district
                        );
                        const totalAvailable = districtStocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
                        
                        // Only show if still insufficient stock
                        if (totalAvailable < item.quantityNeeded) {
                            const shortage = item.quantityNeeded - totalAvailable;
                            const status = totalAvailable === 0 ? 'out_of_stock' : 'low_stock';
                            
                            pendingNotifications.push({
                                _id: item._id,
                                user: {
                                    id: user._id,
                                    name: user.name,
                                    email: user.email
                                },
                                medicineId: item.medicine,
                                medicineName: item.medicineName,
                                weight: item.weight,
                                unit: item.unit,
                                district: user.district,
                                quantityNeeded: item.quantityNeeded,
                                currentStock: totalAvailable,
                                shortage: shortage,
                                status: status,
                                requestedAt: item.notificationRequestedAt || item.addedAt
                            });
                        }
                    }
                }
            }
        }

        // Sort by oldest first and by urgency
        pendingNotifications.sort((a, b) => {
            if (a.status === 'out_of_stock' && b.status !== 'out_of_stock') return -1;
            if (a.status !== 'out_of_stock' && b.status === 'out_of_stock') return 1;
            return new Date(a.requestedAt) - new Date(b.requestedAt);
        });

        console.log(`Found ${pendingNotifications.length} pending notification requests`);
        res.json(pendingNotifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Assign manager to hospital
// @route   PUT /api/admin/hospitals/:id/assign-manager
const assignHospitalManager = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const { managerId } = req.body;
        const hospitalId = req.params.id;

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const manager = await User.findById(managerId);
        if (!manager) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If there was a previous manager, remove their manager role
        if (hospital.manager) {
            const previousManager = await User.findById(hospital.manager);
            if (previousManager) {
                await User.updateOne(
                    { _id: hospital.manager },
                    { $set: { role: 'patient', hospital: '' } }
                );
                console.log(`Removed manager role from previous manager: ${previousManager.email}`);
            }
        }

        // Assign new manager
        hospital.manager = managerId;
        await hospital.save();

        // Update user role and hospital
        await User.updateOne(
            { _id: managerId },
            { $set: { role: 'manager', hospital: hospital.name } }
        );

        console.log(`✅ Assigned ${manager.email} as manager of ${hospital.name}`);

        res.json({ 
            message: `Manager assigned to ${hospital.name}`, 
            hospital,
            manager: {
                id: manager._id,
                name: manager.name,
                email: manager.email
            }
        });
    } catch (error) {
        console.error('Assign manager error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all hospitals for admin
// @route   GET /api/admin/hospitals
const getAllHospitalsForAdmin = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }

        const hospitals = await Hospital.find({ isActive: true })
            .populate('manager', 'name email')
            .sort({ name: 1 });
        
        // Add stats for each hospital
        const hospitalsWithStats = await Promise.all(hospitals.map(async (hospital) => {
            const medicines = await Medicine.find({
                'stocks.hospitalId': hospital._id
            });
            
            const totalMedicines = medicines.length;
            const totalStock = medicines.reduce((sum, med) => {
                const stock = med.stocks.find(s => s.hospitalId.toString() === hospital._id.toString());
                return sum + (stock?.availableQuantity || 0);
            }, 0);
            
            return {
                ...hospital.toObject(),
                stats: {
                    totalMedicines,
                    totalStock
                }
            };
        }));
        
        res.json(hospitalsWithStats);
    } catch (error) {
        console.error('Get hospitals error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Sync existing users to hospitals
// @route   POST /api/admin/users/sync-hospitals
const syncUsersToHospitals = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        
        // Find all users with role manager that have a hospital name but no hospital ID link
        const managers = await User.find({ 
            role: 'manager', 
            hospital: { $ne: '', $exists: true }
        });
        
        let updated = 0;
        let notFound = 0;
        
        for (const manager of managers) {
            // Find hospital by name
            const hospital = await Hospital.findOne({ name: manager.hospital });
            
            if (hospital) {
                // Update hospital with manager
                await Hospital.updateOne(
                    { _id: hospital._id },
                    { $set: { manager: manager._id } }
                );
                updated++;
                console.log(`✅ Synced: ${manager.name} -> ${hospital.name}`);
            } else {
                notFound++;
                console.log(`⚠️ Hospital not found for ${manager.name}: ${manager.hospital}`);
            }
        }
        
        res.json({
            message: `Synced ${updated} managers to hospitals`,
            updated,
            notFound,
            totalManagers: managers.length
        });
    } catch (error) {
        console.error('Sync users error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Export all functions
module.exports = {
    getStats,
    getAllMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    getAllUsers,
    updateStock,
    getNotifications,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    resetUserPassword,
    assignHospitalManager,      
    getAllHospitalsForAdmin,
    syncUsersToHospitals
};