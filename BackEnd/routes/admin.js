const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const { registerValidation, storeValidation } = require('../utils/validators');

// Only admin can access
router.use(auth);
router.use(roles(['admin']));

// Category management
router.post('/categories', categoryController.createCategory);
router.delete('/categories/:id', categoryController.deleteCategory);

// Add user
router.post('/add-user', registerValidation, adminController.addUser);

// Add store
router.post('/add-store', storeValidation, adminController.addStore);

// Dashboard stats
router.get('/dashboard', adminController.dashboard);

// List users
router.get('/users', adminController.listUsers);

// Toggle user suspended
router.put('/users/:id/suspend', adminController.changeUserStatus);

// List stores
router.get('/stores', adminController.listStores);

// Get one store / edit store
router.get('/stores/:id', adminController.getStoreDetail);
router.put('/stores/:id', storeValidation, adminController.updateStore);

// Approve/suspend store
router.put('/stores/:id/status', adminController.changeStoreStatus);

// Reject (permanently remove) a store listing
router.delete('/stores/:id', adminController.deleteStore);

// Flagged review moderation
router.get('/reviews/flagged', adminController.listFlaggedReviews);
router.delete('/reviews/:ratingId', adminController.deleteReview);
router.post('/reviews/:ratingId/clear-flag', adminController.clearFlag);

// Get user details
router.get('/users/:id', adminController.getUserDetail);

module.exports = router;
