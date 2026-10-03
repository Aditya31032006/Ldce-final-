export const MESSAGES = Object.freeze({
  AUTH: Object.freeze({
    SIGNUP_SUCCESS: 'Vendor registered successfully!',
    LOGIN_SUCCESS: 'Login successful!',
    LOGOUT_SUCCESS: 'Logged out successfully.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    ALREADY_EXISTS: 'An account with this email already exists. Please log in.',
    USER_NOT_FOUND: 'Vendor account not found.',
    GOOGLE_AUTH_FAILED: 'Google authentication failed. Please try again.',
    GOOGLE_AUTH_SUCCESS: 'Google Sign-In successful!',
    GOOGLE_ACCOUNT_ONLY: 'This account was registered via Google Sign-In. Please sign in with Google.',
    UNAUTHORIZED: 'Unauthorized. Authentication cookie missing or invalid.',
    OTP_SENT: 'A verification OTP has been sent to your email.',
    OTP_INVALID: 'Invalid OTP code. Please check and try again.',
    OTP_EXPIRED: 'OTP has expired. Please request a new code.',
  }),
  SYSTEM: Object.freeze({
    INTERNAL_ERROR: 'Internal server error.',
    VALIDATION_ERROR: 'Validation error.',
    ROUTE_NOT_FOUND: 'Route not found.',
  }),
});
