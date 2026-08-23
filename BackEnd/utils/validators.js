const { body } = require('express-validator');

exports.registerValidation = [
  body('name').notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 4 }).withMessage('Password must be 4+ chars')
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
];

exports.storeValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Store name required')
    .isLength({ min: 2, max: 120 })
    .withMessage('Name must be 2-120 characters'),

  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Valid email required'),

  body('address')
    .optional({ values: 'falsy' })
    .isLength({ min: 1 })      // <-- IMPORTANT
    .withMessage('Address must not be empty')
    .isLength({ max: 400 })
    .withMessage('Address must be under 400 characters'),

  body('phone')
    .optional({ values: 'falsy' })
    .matches(/^[0-9+\-\s()]{6,20}$/)
    .withMessage('Phone must be 6-20 characters (digits, spaces or + - ( ))'),

  body('openingHours')
    .optional({ values: 'falsy' })
    .isLength({ max: 240 })
    .withMessage('Opening hours must be under 240 characters'),

  body('priceLevel')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 4 })
    .withMessage('Price level must be between 1 and 4'),

  body('categoryId')
    .optional({ values: 'falsy' })
    .isInt()
    .withMessage('Category ID must be integer'),

  body('ownerId')
    .optional({ values: 'falsy' })
    .isInt()
    .withMessage('Owner ID must be integer')
];

