const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
    getHospitalStock,
    dispenseMedicine,
    getLowStockAlerts,
    searchMedicines,
    createPrescription,
    getPatientPrescriptions,
    getActivePrescriptions,
    dispenseFromPrescription,
    getPrescriptionDetails,
    cancelPrescription,
    getPrescriptionHistory,
    getPrescriptionForEdit,
    addPrescriptionItem,
    updatePrescriptionItem,
    removePrescriptionItem
} = require('../controllers/nurseController');

// All nurse routes require authentication and nurse role
router.use(protect);
router.use((req, res, next) => {
    if (req.user.role !== 'nurse') {
        return res.status(403).json({ message: 'Access denied. Nurse only.' });
    }
    next();
});

// Stock management
router.get('/stock', getHospitalStock);
router.post('/dispense', dispenseMedicine);
router.get('/alerts', getLowStockAlerts);
router.get('/search', searchMedicines);

// Prescription management
router.post('/prescription', createPrescription);
router.get('/prescriptions/active', getActivePrescriptions);
router.get('/prescriptions/patient/:patientId', getPatientPrescriptions);
router.get('/prescriptions/history', getPrescriptionHistory);
router.get('/prescription/:id', getPrescriptionDetails);
router.get('/prescription/:id/edit', getPrescriptionForEdit);
router.post('/prescription/dispense', dispenseFromPrescription);
router.put('/prescription/:id/cancel', cancelPrescription);
router.post('/prescription/:id/add-item', addPrescriptionItem);
router.put('/prescription/:id/update-item/:itemId', updatePrescriptionItem);
router.delete('/prescription/:id/remove-item/:itemId', removePrescriptionItem);

module.exports = router;