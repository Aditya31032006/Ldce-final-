/**
 * Standard Application Messages
 */
export const MESSAGES = Object.freeze({
  AUTH: Object.freeze({
    SIGNUP_SUCCESS: 'User registered successfully!',
    LOGIN_SUCCESS: 'Login successful!',
    LOGOUT_SUCCESS: 'Logged out successfully.',
    INVALID_CREDENTIALS: 'Invalid email or password.',
    ALREADY_EXISTS: 'An account with this email already exists. Please log in.',
    USER_NOT_FOUND: 'User account not found.',
    GOOGLE_AUTH_FAILED: 'Google authentication failed. Please try again.',
    GOOGLE_AUTH_SUCCESS: 'Google Sign-In successful!',
    GOOGLE_ACCOUNT_ONLY: 'This account was registered via Google Sign-In. Please sign in with Google.',
    UNAUTHORIZED: 'Unauthorized. Authentication token or cookie missing or invalid.',
    FORBIDDEN: 'Forbidden: Insufficient privileges to perform this action.',
    ACCOUNT_INACTIVE: 'Account is inactive. Please contact your club administrator.',
    CLUB_NOT_ASSOCIATED: 'User is not associated with this club.',
    OTP_SENT: 'A verification OTP has been sent to your email.',
    OTP_INVALID: 'Invalid OTP code. Please check and try again.',
    OTP_EXPIRED: 'OTP has expired. Please request a new code.',
    PASSWORD_RESET_SENT: 'Password reset instructions have been sent to your email.',
    PASSWORD_RESET_SUCCESS: 'Password has been reset successfully.',
  }),
  CLUBS: Object.freeze({
    REGISTER_SUCCESS: 'Club registered successfully!',
    UPDATE_SUCCESS: 'Club details updated successfully.',
    NOT_FOUND: 'Club not found.',
    ACCESS_DENIED: 'Access denied for the specified club.',
  }),
  BOOKINGS: Object.freeze({
    CREATED_SUCCESS: 'Court booking reserved successfully!',
    SLOT_UNAVAILABLE: 'Selected time slot is unavailable or overlapping with another booking.',
    CANCELLED_SUCCESS: 'Booking cancelled successfully.',
    NOT_FOUND: 'Booking not found.',
  }),
  MEMBERS: Object.freeze({
    CREATED_SUCCESS: 'Member created successfully.',
    UPDATED_SUCCESS: 'Member details updated successfully.',
    NOT_FOUND: 'Member not found.',
  }),
  SYSTEM: Object.freeze({
    INTERNAL_ERROR: 'Internal server error.',
    VALIDATION_ERROR: 'Validation error.',
    ROUTE_NOT_FOUND: 'Route not found.',
    DATABASE_ERROR: 'Database operation failed.',
  }),
});

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  MANAGER: 'manager',
  COACH: 'coach',
  STAFF: 'staff',
  MEMBER: 'member',
  PUBLIC: 'public',
});

export default { MESSAGES, ROLES };
