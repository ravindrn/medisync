const Medicine = require('../models/Medicine');
const Hospital = require('../models/Hospital');
const Transfer = require('../models/Transfer');
const Report = require('../models/Report'); // Add this import

// Cache for dashboard stats
let cachedStats = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// @desc    Get ministry dashboard stats (OPTIMIZED)
// @route   GET /api/ministry/dashboard
const getDashboardStats = async (req, res) => {
    try {
        // Check cache first
        if (cachedStats && cacheTime && (Date.now() - cacheTime < CACHE_DURATION)) {
            return res.json(cachedStats);
        }

        const [allHospitals, allMedicines] = await Promise.all([
            Hospital.find({ isActive: true }).select('name district').lean(),
            Medicine.find().select('medicineName weight unit stocks').lean()
        ]);

        const totalHospitals = allHospitals.length;
        const totalMedicineTypes = allMedicines.length;

        let totalStockUnits = 0;
        let lowStockCount = 0;
        let criticalStockCount = 0;
        let outOfStockCount = 0;
        const lowStockItems = [];
        const hospitalStockMap = new Map();

        for (const medicine of allMedicines) {
            for (const stock of medicine.stocks) {
                totalStockUnits += stock.availableQuantity;
                
                if (stock.availableQuantity === 0) {
                    outOfStockCount++;
                } else if (stock.availableQuantity < 10) {
                    criticalStockCount++;
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
                
                const hospitalId = stock.hospitalId?.toString();
                if (hospitalId) {
                    if (!hospitalStockMap.has(hospitalId)) {
                        hospitalStockMap.set(hospitalId, { lowStock: 0, critical: 0 });
                    }
                    const stats = hospitalStockMap.get(hospitalId);
                    if (stock.availableQuantity < 10 && stock.availableQuantity > 0) {
                        stats.critical++;
                    } else if (stock.availableQuantity < 50 && stock.availableQuantity > 0) {
                        stats.lowStock++;
                    }
                }
            }
        }

        const hospitalsWithLowStock = [];
        for (const hospital of allHospitals) {
            const stats = hospitalStockMap.get(hospital._id.toString());
            if (stats && (stats.lowStock > 0 || stats.critical > 0)) {
                hospitalsWithLowStock.push({
                    id: hospital._id,
                    name: hospital.name,
                    district: hospital.district,
                    lowStockCount: stats.lowStock,
                    criticalCount: stats.critical
                });
            }
            if (hospitalsWithLowStock.length >= 50) break;
        }

        const result = {
            totalHospitals,
            totalMedicineTypes,
            totalStockUnits,
            lowStockCount,
            criticalStockCount,
            outOfStockCount,
            lowStockItems: lowStockItems.slice(0, 50),
            hospitalsWithLowStock: hospitalsWithLowStock.slice(0, 20),
            timestamp: new Date()
        };

        cachedStats = result;
        cacheTime = Date.now();

        res.json(result);
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get stock aggregation
// @route   GET /api/ministry/stock-aggregation
const getStockAggregation = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { search, page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pipeline = [
            { $unwind: "$stocks" },
            {
                $group: {
                    _id: {
                        medicineName: "$medicineName",
                        weight: "$weight",
                        unit: "$unit"
                    },
                    totalQuantity: { $sum: "$stocks.availableQuantity" },
                    hospitalCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    medicineName: "$_id.medicineName",
                    weight: "$_id.weight",
                    unit: "$_id.unit",
                    totalQuantity: 1,
                    hospitalCount: 1
                }
            },
            { $sort: { medicineName: 1 } }
        ];

        if (search) {
            pipeline.unshift({
                $match: { medicineName: { $regex: search, $options: 'i' } }
            });
        }

        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Medicine.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

        const medicines = await Medicine.aggregate(pipeline);
        
        const totalUnits = medicines.reduce((sum, m) => sum + m.totalQuantity, 0);
        const avgPerMedicine = medicines.length > 0 ? Math.round(totalUnits / medicines.length) : 0;

        res.json({
            medicines,
            summary: {
                totalMedicines: total,
                totalUnits,
                avgPerMedicine,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Get stock aggregation error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get shortages
// @route   GET /api/ministry/shortages
const getShortages = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { page = 1, limit = 50, severity = 'all' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const pipeline = [
            { $unwind: "$stocks" },
            { $match: { "stocks.availableQuantity": { $lt: 50 } } },
            {
                $project: {
                    medicineName: 1,
                    weight: 1,
                    unit: 1,
                    stock: "$stocks"
                }
            },
            {
                $addFields: {
                    status: {
                        $cond: [
                            { $lt: ["$stock.availableQuantity", 10] },
                            "Critical",
                            "Low Stock"
                        ]
                    },
                    severity: {
                        $cond: [
                            { $lt: ["$stock.availableQuantity", 10] },
                            "High",
                            "Medium"
                        ]
                    }
                }
            },
            { $sort: { "stock.availableQuantity": 1 } }
        ];

        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Medicine.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

        const shortages = await Medicine.aggregate(pipeline);
        
        const formattedShortages = shortages.map(item => ({
            medicineId: item._id,
            medicineName: item.medicineName,
            weight: item.weight,
            unit: item.unit,
            hospitalId: item.stock.hospitalId,
            hospitalName: item.stock.hospitalName,
            district: item.stock.district,
            currentStock: item.stock.availableQuantity,
            status: item.status,
            severity: item.severity,
            estimatedDaysRemaining: Math.floor(item.stock.availableQuantity / 5)
        }));

        res.json({
            shortages: formattedShortages,
            totalShortages: total,
            criticalCount: formattedShortages.filter(s => s.status === 'Critical').length,
            lowStockCount: formattedShortages.filter(s => s.status === 'Low Stock').length,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get shortages error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get excess stock
// @route   GET /api/ministry/excess-stock
const getExcessStock = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const EXCESS_THRESHOLD = 1000;

        const pipeline = [
            { $unwind: "$stocks" },
            { $match: { "stocks.availableQuantity": { $gt: EXCESS_THRESHOLD } } },
            {
                $project: {
                    medicineName: 1,
                    weight: 1,
                    unit: 1,
                    stock: "$stocks",
                    excessUnits: { $subtract: ["$stocks.availableQuantity", EXCESS_THRESHOLD] },
                    daysSupply: { $divide: ["$stocks.availableQuantity", 50] }
                }
            },
            { $sort: { "stock.availableQuantity": -1 } }
        ];

        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Medicine.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

        const excessItems = await Medicine.aggregate(pipeline);
        
        const formattedExcess = excessItems.map(item => ({
            medicineId: item._id,
            medicineName: item.medicineName,
            weight: item.weight,
            unit: item.unit,
            hospitalId: item.stock.hospitalId,
            hospitalName: item.stock.hospitalName,
            district: item.stock.district,
            currentStock: item.stock.availableQuantity,
            dailyUsage: 50,
            daysSupply: Math.floor(item.daysSupply),
            excessUnits: item.excessUnits
        }));

        res.json({
            excessItems: formattedExcess,
            totalExcessItems: total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get excess stock error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get analytics data
// @route   GET /api/ministry/analytics
const getAnalytics = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const [stockByDistrict, topMedicines, monthlyTransfers] = await Promise.all([
            Medicine.aggregate([
                { $unwind: "$stocks" },
                {
                    $group: {
                        _id: "$stocks.district",
                        totalStock: { $sum: "$stocks.availableQuantity" },
                        medicineCount: { $sum: 1 }
                    }
                },
                { $sort: { totalStock: -1 } },
                { $limit: 20 }
            ]),
            Medicine.aggregate([
                { $unwind: "$stocks" },
                {
                    $group: {
                        _id: {
                            medicineName: "$medicineName",
                            weight: "$weight",
                            unit: "$unit"
                        },
                        totalStock: { $sum: "$stocks.availableQuantity" }
                    }
                },
                { $sort: { totalStock: -1 } },
                { $limit: 10 }
            ]),
            Transfer.aggregate([
                { $match: { createdAt: { $gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) }, status: 'completed' } },
                { $unwind: "$medicines" },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        totalQuantity: { $sum: "$medicines.approvedQuantity" }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ])
        ]);

        const allMedicines = await Medicine.find().select('stocks').lean();
        const statusCounts = {
            Available: 0,
            'Low Stock': 0,
            Critical: 0,
            'Out of Stock': 0
        };
        
        for (const medicine of allMedicines) {
            for (const stock of medicine.stocks) {
                if (stock.availableQuantity === 0) {
                    statusCounts['Out of Stock']++;
                } else if (stock.availableQuantity < 10) {
                    statusCounts.Critical++;
                } else if (stock.availableQuantity < 50) {
                    statusCounts['Low Stock']++;
                } else {
                    statusCounts.Available++;
                }
            }
        }

        res.json({
            stockByDistrict,
            statusCounts,
            topMedicines,
            monthlyTransfers,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Predict shortages
// @route   GET /api/ministry/predict-shortages
const predictShortages = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { page = 1, limit = 50 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const DAILY_USAGE = 10;

        const pipeline = [
            { $unwind: "$stocks" },
            { $match: { "stocks.availableQuantity": { $gt: 0 } } },
            {
                $addFields: {
                    daysRemaining: { $floor: { $divide: ["$stocks.availableQuantity", DAILY_USAGE] } }
                }
            },
            { $match: { daysRemaining: { $lt: 30 } } },
            {
                $addFields: {
                    severity: {
                        $cond: [
                            { $lt: ["$daysRemaining", 7] },
                            "Critical",
                            { $cond: [{ $lt: ["$daysRemaining", 14] }, "High", "Medium"] }
                        ]
                    },
                    predictedDate: {
                        $add: [new Date(), { $multiply: ["$daysRemaining", 24 * 60 * 60 * 1000] }]
                    }
                }
            },
            { $sort: { daysRemaining: 1 } }
        ];

        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Medicine.aggregate(countPipeline);
        const total = countResult[0]?.total || 0;

        pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

        const predictions = await Medicine.aggregate(pipeline);

        const formattedPredictions = predictions.map(item => ({
            medicineId: item._id,
            medicineName: item.medicineName,
            weight: item.weight,
            unit: item.unit,
            hospitalId: item.stocks.hospitalId,
            hospitalName: item.stocks.hospitalName,
            district: item.stocks.district,
            currentStock: item.stocks.availableQuantity,
            dailyUsage: DAILY_USAGE,
            daysRemaining: item.daysRemaining,
            predictedShortageDate: item.predictedDate,
            severity: item.severity
        }));

        res.json({
            predictions: formattedPredictions,
            totalPredictions: total,
            criticalPredictions: formattedPredictions.filter(p => p.severity === 'Critical').length,
            highPredictions: formattedPredictions.filter(p => p.severity === 'High').length,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Predict shortages error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Export CSV
// @route   GET /api/ministry/export-csv
const exportCSV = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { type } = req.query;
        let data = [];
        let headers = [];
        
        if (type === 'stock' || !type) {
            const medicines = await Medicine.find()
                .select('medicineName weight unit stocks')
                .sort({ medicineName: 1 })
                .limit(2000);
            
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    data.push({
                        'Medicine Name': medicine.medicineName,
                        'Strength': `${medicine.weight}${medicine.unit}`,
                        'Hospital': stock.hospitalName,
                        'District': stock.district,
                        'Available Quantity': stock.availableQuantity,
                        'Status': stock.status,
                        'Last Updated': new Date(stock.lastUpdated).toLocaleDateString()
                    });
                }
            }
            headers = ['Medicine Name', 'Strength', 'Hospital', 'District', 'Available Quantity', 'Status', 'Last Updated'];
        } else if (type === 'shortages') {
            const medicines = await Medicine.find()
                .select('medicineName weight unit stocks')
                .limit(2000);
                
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    if (stock.availableQuantity < 50) {
                        data.push({
                            'Medicine': medicine.medicineName,
                            'Strength': `${medicine.weight}${medicine.unit}`,
                            'Hospital': stock.hospitalName,
                            'District': stock.district,
                            'Current Stock': stock.availableQuantity,
                            'Status': stock.availableQuantity < 10 ? 'Critical' : 'Low Stock',
                            'Days Remaining': Math.floor(stock.availableQuantity / 5)
                        });
                    }
                }
            }
            headers = ['Medicine', 'Strength', 'Hospital', 'District', 'Current Stock', 'Status', 'Days Remaining'];
        } else if (type === 'excess') {
            const medicines = await Medicine.find()
                .select('medicineName weight unit stocks')
                .limit(2000);
                
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    if (stock.availableQuantity > 1000) {
                        data.push({
                            'Medicine': medicine.medicineName,
                            'Strength': `${medicine.weight}${medicine.unit}`,
                            'Hospital': stock.hospitalName,
                            'District': stock.district,
                            'Current Stock': stock.availableQuantity,
                            'Days Supply': Math.floor(stock.availableQuantity / 50),
                            'Excess Units': stock.availableQuantity - 1000
                        });
                    }
                }
            }
            headers = ['Medicine', 'Strength', 'Hospital', 'District', 'Current Stock', 'Days Supply', 'Excess Units'];
        }
        
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header] || '';
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        }
        
        const csvContent = csvRows.join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=ministry_${type}_report_${Date.now()}.csv`);
        res.send(csvContent);
    } catch (error) {
        console.error('Export CSV error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate and save report
// @route   POST /api/ministry/generate-report
const generateReport = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { type, filters } = req.body;
        
        let reportData = [];
        let recordCount = 0;
        
        if (type === 'stock') {
            const medicines = await Medicine.find().select('medicineName weight unit stocks').lean();
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    reportData.push({
                        'Medicine Name': medicine.medicineName,
                        'Strength': `${medicine.weight}${medicine.unit}`,
                        'Hospital': stock.hospitalName,
                        'District': stock.district,
                        'Available Quantity': stock.availableQuantity,
                        'Status': stock.status,
                        'Last Updated': new Date(stock.lastUpdated).toLocaleDateString()
                    });
                }
            }
            recordCount = reportData.length;
        } else if (type === 'shortages') {
            const medicines = await Medicine.find().select('medicineName weight unit stocks').lean();
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    if (stock.availableQuantity < 50) {
                        reportData.push({
                            'Medicine': medicine.medicineName,
                            'Strength': `${medicine.weight}${medicine.unit}`,
                            'Hospital': stock.hospitalName,
                            'District': stock.district,
                            'Current Stock': stock.availableQuantity,
                            'Status': stock.availableQuantity < 10 ? 'Critical' : 'Low Stock',
                            'Days Remaining': Math.floor(stock.availableQuantity / 5)
                        });
                    }
                }
            }
            recordCount = reportData.length;
        } else if (type === 'excess') {
            const medicines = await Medicine.find().select('medicineName weight unit stocks').lean();
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    if (stock.availableQuantity > 1000) {
                        reportData.push({
                            'Medicine': medicine.medicineName,
                            'Strength': `${medicine.weight}${medicine.unit}`,
                            'Hospital': stock.hospitalName,
                            'District': stock.district,
                            'Current Stock': stock.availableQuantity,
                            'Days Supply': Math.floor(stock.availableQuantity / 50),
                            'Excess Units': stock.availableQuantity - 1000
                        });
                    }
                }
            }
            recordCount = reportData.length;
        }
        
        const headers = Object.keys(reportData[0] || {});
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const row of reportData) {
            const values = headers.map(header => {
                const value = row[header] || '';
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        }
        
        const csvContent = csvRows.join('\n');
        const fileName = `ministry_${type}_report_${Date.now()}.csv`;
        const fileSize = Buffer.byteLength(csvContent, 'utf8');
        
        const report = await Report.create({
            type,
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${new Date().toLocaleDateString()}`,
            description: `Generated ${type} report with ${recordCount} records`,
            generatedBy: {
                id: req.user.id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role
            },
            fileName,
            fileSize,
            recordCount,
            filters: filters || {}
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
        res.setHeader('X-Report-ID', report.reportId);
        res.send(csvContent);
        
        console.log(`📊 Report generated: ${report.reportId} by ${req.user.name}`);
        
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get report history
// @route   GET /api/ministry/reports
const getReportHistory = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { page = 1, limit = 20, type = 'all' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const query = { 'generatedBy.id': req.user.id };
        if (type !== 'all') {
            query.type = type;
        }
        
        const [reports, total] = await Promise.all([
            Report.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Report.countDocuments(query)
        ]);
        
        res.json({
            reports,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(total / parseInt(limit)),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get report history error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single report details
// @route   GET /api/ministry/reports/:id
const getReportDetails = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const report = await Report.findOne({ 
            _id: req.params.id,
            'generatedBy.id': req.user.id 
        });
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        res.json(report);
    } catch (error) {
        console.error('Get report details error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download existing report
// @route   GET /api/ministry/reports/:id/download
const downloadReport = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const report = await Report.findOne({ 
            _id: req.params.id,
            'generatedBy.id': req.user.id 
        });
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        let reportData = [];
        
        if (report.type === 'stock') {
            const medicines = await Medicine.find().select('medicineName weight unit stocks').lean();
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    reportData.push({
                        'Medicine Name': medicine.medicineName,
                        'Strength': `${medicine.weight}${medicine.unit}`,
                        'Hospital': stock.hospitalName,
                        'District': stock.district,
                        'Available Quantity': stock.availableQuantity,
                        'Status': stock.status,
                        'Last Updated': new Date(stock.lastUpdated).toLocaleDateString()
                    });
                }
            }
        } else if (report.type === 'shortages') {
            const medicines = await Medicine.find().select('medicineName weight unit stocks').lean();
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    if (stock.availableQuantity < 50) {
                        reportData.push({
                            'Medicine': medicine.medicineName,
                            'Strength': `${medicine.weight}${medicine.unit}`,
                            'Hospital': stock.hospitalName,
                            'District': stock.district,
                            'Current Stock': stock.availableQuantity,
                            'Status': stock.availableQuantity < 10 ? 'Critical' : 'Low Stock',
                            'Days Remaining': Math.floor(stock.availableQuantity / 5)
                        });
                    }
                }
            }
        } else if (report.type === 'excess') {
            const medicines = await Medicine.find().select('medicineName weight unit stocks').lean();
            for (const medicine of medicines) {
                for (const stock of medicine.stocks) {
                    if (stock.availableQuantity > 1000) {
                        reportData.push({
                            'Medicine': medicine.medicineName,
                            'Strength': `${medicine.weight}${medicine.unit}`,
                            'Hospital': stock.hospitalName,
                            'District': stock.district,
                            'Current Stock': stock.availableQuantity,
                            'Days Supply': Math.floor(stock.availableQuantity / 50),
                            'Excess Units': stock.availableQuantity - 1000
                        });
                    }
                }
            }
        }
        
        const headers = Object.keys(reportData[0] || {});
        const csvRows = [];
        csvRows.push(headers.join(','));
        
        for (const row of reportData) {
            const values = headers.map(header => {
                const value = row[header] || '';
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            });
            csvRows.push(values.join(','));
        }
        
        const csvContent = csvRows.join('\n');
        
        await Report.updateOne(
            { _id: report._id },
            { 
                $inc: { downloadCount: 1 },
                $set: { lastDownloaded: new Date() }
            }
        );
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${report.fileName}`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('Download report error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete report
// @route   DELETE /api/ministry/reports/:id
const deleteReport = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const report = await Report.findOneAndDelete({ 
            _id: req.params.id,
            'generatedBy.id': req.user.id 
        });
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        
        res.json({ 
            message: 'Report deleted successfully',
            reportId: report.reportId 
        });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete multiple reports
// @route   DELETE /api/ministry/reports
const deleteMultipleReports = async (req, res) => {
    try {
        if (req.user.role !== 'ministry_officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Ministry officers only.' });
        }

        const { reportIds } = req.body;
        
        if (!reportIds || !reportIds.length) {
            return res.status(400).json({ message: 'No report IDs provided' });
        }
        
        const result = await Report.deleteMany({
            _id: { $in: reportIds },
            'generatedBy.id': req.user.id
        });
        
        res.json({ 
            message: `${result.deletedCount} reports deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Delete multiple reports error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardStats,
    getStockAggregation,
    getShortages,
    getExcessStock,
    getAnalytics,
    predictShortages,
    exportCSV,
    generateReport,
    getReportHistory,
    getReportDetails,
    downloadReport,
    deleteReport,
    deleteMultipleReports
};