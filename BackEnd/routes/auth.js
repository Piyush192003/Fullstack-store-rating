const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { registerValidation, loginValidation } = require('../utils/validators');

// Public
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// Signed-in account (any role)
router.get('/me', auth, authController.me);
router.put('/me', auth, authController.updateMe);
router.post('/me/photo', auth, (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    next();
  });
}, authController.uploadMyPhoto);
router.post('/sessions/logout-all', auth, authController.logoutAllDevices);
router.post('/me/data', auth, authController.exportMyData);
router.delete('/me', auth, authController.deleteMe);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;
