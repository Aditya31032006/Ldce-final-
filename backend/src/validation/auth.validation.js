import { body, validationResult } from 'express-validator';
import { STATUS_CODES } from '../constants/statusCodes.js';

/**
 * Middleware that inspects validationResult and halts request if invalid
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: firstError.msg,
      errors: errors.array(),
    });
  }
  next();
}

/**
 * Validation rules for User Signup / Registration
 */
export const signupValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(/^[0-9+\s\-]{7,15}$/)
    .withMessage('Please provide a valid phone number (7-15 digits)'),

  body().custom((_, { req }) => {
    const fullName = req.body.fullName || req.body.name;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      throw new Error('Full name is required (minimum 2 characters)');
    }
    // Normalize to fullName for controller
    req.body.fullName = fullName.trim();
    return true;
  }),

  validate,
];

/**
 * Validation rules for User Login
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),

  body('clubId')
    .optional({ values: 'falsy' })
    .trim(),

  validate,
];

/**
 * Validation rules for OTP verification
 */
export const otpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
    .isNumeric().withMessage('OTP must contain only numbers'),

  validate,
];

/**
 * Validation rules for Password Reset Request
 */
export const passwordResetRequestValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  validate,
];

/**
 * Validation rules for Password Reset Confirmation
 */
export const passwordResetConfirmValidation = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  validate,
];

export default {
  validate,
  signupValidation,
  loginValidation,
  otpValidation,
  passwordResetRequestValidation,
  passwordResetConfirmValidation,
};
