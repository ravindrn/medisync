const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getStats,
    getAllMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    getAllUsers,
    updateStock,
    getNotifications,
    getUserById,              // Add this
    createUser,               // Add this
    updateUser,               // Add this
    deleteUser,               // Add this
    resetUserPassword,        // Add this
    assignHospitalManager,
    getAllHospitalsForAdmin,
    syncUsersToHospitals      // Add this
} = require('../controllers/adminController');

// All admin routes require authentication
router.use(protect);

// Admin routes
router.get('/stats', getStats);
router.get('/medicines', getAllMedicines);
router.post('/medicines', addMedicine);
router.put('/medicines/:id', updateMedicine);
router.put('/medicines/:id/stock', updateStock);
router.delete('/medicines/:id', deleteMedicine);
router.get('/notifications', getNotifications);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);
router.post('/users/sync-hospitals', syncUsersToHospitals);  // Add this

// Hospital management routes
router.get('/hospitals', getAllHospitalsForAdmin);
router.put('/hospitals/:id/assign-manager', assignHospitalManager);

module.exports = router;