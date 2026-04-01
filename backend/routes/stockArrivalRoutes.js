const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { bulkNotifyStockArrival } = require('../controllers/stockArrivalController');

router.use(protect);

// POST /api/stock-arrivals/bulk-notify
router.post('/bulk-notify', bulkNotifyStockArrival);

module.exports = router;