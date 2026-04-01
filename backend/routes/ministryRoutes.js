const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getDashboardStats,
    getStockAggregation,
    getShortages,
    getExcessStock,
    getAnalytics,
    predictShortages,
    exportCSV,
    generateReport,
    getReportHistory,
    downloadReport,
    deleteReport,
    deleteMultipleReports
} = require('../controllers/ministryController');

// All routes require authentication
router.use(protect);

// Dashboard routes
router.get('/dashboard', getDashboardStats);
router.get('/stock-aggregation', getStockAggregation);
router.get('/shortages', getShortages);
router.get('/excess-stock', getExcessStock);
router.get('/analytics', getAnalytics);
router.get('/predict-shortages', predictShortages);
router.get('/export-csv', exportCSV);

// Report management routes
router.post('/generate-report', generateReport);
router.get('/reports', getReportHistory);
router.get('/reports/:id/download', downloadReport);
router.delete('/reports/:id', deleteReport);
router.delete('/reports', deleteMultipleReports);

module.exports = router;