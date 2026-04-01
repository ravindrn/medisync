const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    createTransferRequest,
    getPendingRequests,
    approveTransfer,
    rejectTransfer,
    confirmReceipt,
    getTransferHistory,
    getAllHospitals,
    getHospitalStock,
    generateTransferPDF,
    downloadTransferPDF,
    getWardActivities,
    getWardStockSummary,
    getWardInventory,
} = require('../controllers/transferController');

const {
    getPendingStockRequests,
    approveStockRequest,
    rejectStockRequest
} = require('../controllers/stockArrivalController');

// All transfer routes require authentication
router.use(protect);

// Stock arrival request routes for admin compatibility
router.get('/stock-requests/pending', getPendingStockRequests);
router.put('/stock-requests/:id/approve', approveStockRequest);
router.put('/stock-requests/:id/reject', rejectStockRequest);

// Transfer request routes
router.post('/request', createTransferRequest);
router.get('/pending', getPendingRequests);
router.put('/:id/approve', approveTransfer);
router.put('/:id/reject', rejectTransfer);
router.put('/:id/confirm', confirmReceipt);
router.get('/history', getTransferHistory);
router.get('/hospitals', getAllHospitals);
router.get('/hospital/:id/stock', getHospitalStock);
router.get('/:id/pdf', generateTransferPDF);
router.get('/:id/download-pdf', downloadTransferPDF);

// Ward management routes
router.get('/ward-activities', getWardActivities);
router.get('/ward-stock-summary', getWardStockSummary);
router.get('/ward-inventory/:wardName', getWardInventory);

module.exports = router;