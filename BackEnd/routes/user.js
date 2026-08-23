const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');

// Normal user or admin can use user routes
router.use(auth);
router.use(roles(['user', 'admin']));

// Get signed-in user profile
router.get('/profile', userController.getProfile);

// Get store list
router.get('/stores', userController.listStores);

// Get one store with reviews
router.get('/stores/:id', userController.getStore);

// Rate a store (with optional written review)
router.post('/rating', userController.submitRating);

// Delete own rating for a store
router.delete('/rating/:storeId', userController.deleteRating);

// Toggle helpful on a review
router.post('/rating/:ratingId/helpful', userController.toggleHelpful);

// Change password
router.post('/change-password', userController.changePassword);

// All ratings & reviews written by the signed-in user
router.get('/my-reviews', userController.myReviews);

// Favorites
router.get('/favorites/ids', userController.favoriteIds);
router.get('/favorites', userController.listFavorites);
router.post('/favorites/:storeId/toggle', userController.toggleFavorite);

// Notifications
router.get('/notifications', userController.getNotifications);
router.post('/notifications/read-all', userController.markNotificationsRead);

module.exports = router;
