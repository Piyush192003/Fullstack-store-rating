const express = require('express');
const router = express.Router();

const ownerController = require('../controllers/ownerController');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const upload = require('../middleware/upload');

// Only store owners
router.use(auth);
router.use(roles(['owner']));

// Get all ratings for owner store
router.get('/ratings', ownerController.myStoreRatings);

// Register a brand-new store (owners without a store yet)
router.post('/store', ownerController.registerStore);

// Update owner store information
router.put('/store', ownerController.updateStore);

// Unclaimed stores that can be claimed
router.get('/unclaimed', ownerController.listUnclaimedStores);

// Claim an existing unowned store
router.post('/store/claim', ownerController.claimStore);

// Upload store images (multipart field: images, max 5 per request)
router.post('/store/images', (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });
}, ownerController.uploadImages);

// Remove one store image by its index
router.delete('/store/images/:index', ownerController.deleteImage);

// Reply to a customer review
router.post('/rating/:ratingId/reply', ownerController.replyToReview);

// Report an abusive/fake review
router.post('/rating/:ratingId/report', ownerController.reportReview);

// Change password
router.post('/change-password', ownerController.changePassword);

module.exports = router;
