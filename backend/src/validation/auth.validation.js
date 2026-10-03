import { body, validationResult } from 'express-validator';
import { STATUS_CODES } from '../constants/statusCodes.js';

/**
 * Middleware that inspects validationResult and halts request if invalid
 */
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorList = errors.array();
    const firstError = errorList[0];
    return res.status(STATUS_CODES.BAD_REQUEST).json({
      success: false,
      message: firstError.msg,
      errors: errorList.map((err) => ({
        field: err.path || err.param,
        message: err.msg,
      })),
    });
  }
  next();
}

/**
 * Validation rules for Direct User Signup (all fields entered manually)
 */
export const directSignupValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required for direct registration')
    .matches(/^[0-9+\s\-]{7,15}$/).withMessage('Please provide a valid phone number (7-15 digits)'),

  body().custom((_, { req }) => {
    const fullName = req.body.fullName || req.body.full_name || req.body.name;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      throw new Error('Full name is required (minimum 2 characters)');
    }
    // Normalize to fullName for controller
    req.body.fullName = fullName.trim();
    return true;
  }),

  body('avatarUrl')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Avatar URL must be a valid URL'),

  validate,
];

/**
 * Validation rules for Club / Facility Owner Signup
 */
export const clubSignupValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email address is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9+\s\-]{7,15}$/).withMessage('Please provide a valid phone number (7-15 digits)'),

  body().custom((_, { req }) => {
    const fullName = req.body.fullName || req.body.full_name || req.body.name;
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      throw new Error('Administrator full name is required (minimum 2 characters)');
    }
    req.body.fullName = fullName.trim();
    return true;
  }),

  body('clubName')
    .trim()
    .notEmpty().withMessage('Club or facility name is required')
    .isLength({ min: 2 }).withMessage('Club name must be at least 2 characters'),

  body('slug')
    .trim()
    .notEmpty().withMessage('Club subdomain slug is required')
    .matches(/^[a-z0-9]+(-[a-z0-9]+)*$/).withMessage('Slug can only contain lowercase letters, numbers, and single hyphens (e.g. champions-club)'),

  body('city')
    .optional({ values: 'falsy' })
    .trim(),

  validate,
];

/**
 * Validation rules for Direct User Login
 */
export const directLoginValidation = [
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
 * Validation rules for Setup Profile (adding remaining fields like phone after Google OAuth)
 */
export const setupProfileValidation = [
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required to complete profile setup')
    .matches(/^[0-9+\s\-]{7,15}$/).withMessage('Please provide a valid phone number (7-15 digits)'),

  body('fullName')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),

  body('avatarUrl')
    .optional({ values: 'falsy' })
    .isURL().withMessage('Avatar URL must be a valid URL'),

  body('password')
    .optional({ values: 'falsy' })
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),

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

// Aliases for compatibility
export const signupValidation = directSignupValidation;
export const loginValidation = directLoginValidation;

export default {
  validate,
  directSignupValidation,
  clubSignupValidation,
  directLoginValidation,
  setupProfileValidation,
  signupValidation,
  loginValidation,
  otpValidation,
  passwordResetRequestValidation,
  passwordResetConfirmValidation,
};
