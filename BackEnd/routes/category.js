const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Public: list all categories
router.get('/', categoryController.listCategories);

module.exports = router;
