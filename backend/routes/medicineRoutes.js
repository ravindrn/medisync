const express = require('express');
const router = express.Router();
const {
    searchMedicines,
    getDistricts,
    addToWatchlist,
    getWatchlist,
    updateWatchlistItem,
    removeFromWatchlist,
    requestNotification,
    getHospitalStock,
    getMyHospitalStock,
    getHospitalsWithStock,
    searchMedicinesAcrossHospitals,
    getDistrictsWithHospitals,
    getMedicineStockAcrossHospitals
} = require('../controllers/medicineController');
const { protect } = require('../middleware/authMiddleware');

// Public routes (no authentication required)
router.get('/districts', getDistricts);

router.post('/search', searchMedicines);

// Protected routes (authentication required)
router.use(protect);

// ==================== WATCHLIST ROUTES ====================
router.get('/watchlist', getWatchlist);
router.post('/watchlist', addToWatchlist);
router.put('/watchlist/:itemId', updateWatchlistItem);
router.delete('/watchlist/:itemId', removeFromWatchlist);
router.post('/notify', requestNotification);

// ==================== HOSPITAL MANAGER ROUTES ====================
router.get('/my-hospital-stock', getMyHospitalStock);
router.get('/hospital/:hospitalId/stock', getHospitalStock);
router.get('/hospitals-with-stock', getHospitalsWithStock);
router.get('/search-across', searchMedicinesAcrossHospitals);
router.get('/districts-with-hospitals', getDistrictsWithHospitals);
router.get('/:id/stock-across', getMedicineStockAcrossHospitals);

module.exports = router;