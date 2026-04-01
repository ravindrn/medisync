const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getShortages,
    getAllMedicines,
    getHospitals,
    createDonation,
    getDonationHistory,
    getDonationDetails,
    downloadCertificate,
    getDonationRequests,
    approveDonation,
    completeDonation,
    rejectDonation,
    getDonationForEdit,
    updateDonation,
    cancelDonation,
    getPendingDeliveries,           // ← ADD THIS
    confirmDonationReceipt,         // ← ADD THIS
    completeDonationAfterDelivery   // ← ADD THIS
} = require('../controllers/donorController');

// Public routes (for donors)
router.get('/shortages', getShortages);
router.get('/medicines', getAllMedicines);
router.get('/hospitals', getHospitals);

// Protected donor routes
router.use(protect);
router.post('/pledge', createDonation);
router.get('/history', getDonationHistory);
router.get('/donation/:id', getDonationDetails);
router.get('/donation/:id/edit', getDonationForEdit);
router.put('/donation/:id', updateDonation);
router.delete('/donation/:id', cancelDonation);
router.get('/certificate/:id/download', downloadCertificate);

// Admin donation management routes
router.get('/admin/requests', getDonationRequests);
router.put('/admin/approve/:id', approveDonation);
router.put('/admin/reject/:id', rejectDonation);

// Manager donation confirmation routes
router.get('/manager/pending', getPendingDeliveries);
router.put('/manager/confirm/:id', confirmDonationReceipt);

// Admin complete after delivery route
router.put('/admin/complete-after-delivery/:id', completeDonationAfterDelivery);

module.exports = router;