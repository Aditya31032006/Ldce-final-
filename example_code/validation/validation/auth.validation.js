import { body, validationResult } from "express-validator";
import { STATUS_CODES } from "../constants/statusCodes.js";

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
            errors: errors.array() 
        });
    }
    next();
}

/**
 * Validation rules for Vendor Signup
 */
export const signupValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Full name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters long'),

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

    validate
];

/**
 * Validation rules for Vendor Login
 */
export const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email address is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),

    validate
];