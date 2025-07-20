import { body, ValidationChain } from 'express-validator';

export const placeOrderValidation: ValidationChain[] = [
  body('userId').isMongoId().withMessage('Invalid userId'),
  body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
  body('items.*.name').notEmpty().withMessage('Item name is required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Item price must be a positive number'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Item quantity must be at least 1'),
  body('items.*.size').optional().isString().withMessage('Item size must be a string'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('address').isObject().withMessage('Address must be an object'),
  body('address.street').notEmpty().withMessage('Street is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.zip').notEmpty().withMessage('Zip code is required'),
  body('address.country').notEmpty().withMessage('Country is required'),
  body('address.phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Phone number must be a valid international format (e.g., +1234567890)'),
];

export const verifyStripeValidation: ValidationChain[] = [
  body('orderId').isMongoId().withMessage('Invalid orderId'),
  body('userId').isMongoId().withMessage('Invalid userId'),
  body('success').optional().isString().withMessage('Success must be a string'),
];

export const userOrdersValidation: ValidationChain[] = [
  body('userId').isMongoId().withMessage('Invalid userId'),
];

export const updateStatusValidation: ValidationChain[] = [
  body('orderId').isMongoId().withMessage('Invalid orderId'),
  body('status')
    .isIn(['Order Placed', 'Pending', 'Shipped', 'Delivered', 'Cancelled'])
    .withMessage('Invalid status'),
];

export const summaryValidation: ValidationChain[] = [
  body('userId').isMongoId().withMessage('Invalid userId'),
];