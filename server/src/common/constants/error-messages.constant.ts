/** Centralized user-facing error messages — import instead of inlining strings. */
export const ErrorMessages = {
  // Generic (Prisma translation layer)
  UNIQUE_CONFLICT: 'A record with this unique value already exists.',
  RECORD_NOT_FOUND: 'Record not found.',
  RELATED_RECORD_MISSING: 'Related record does not exist.',

  // Pets
  PET_NOT_FOUND: 'Pet not found.',
  PET_SIZE_INVALID: 'Pet size does not exist or is inactive.',
  PET_WEIGHT_UNMATCHED: 'No size band matches this weight — ask the shop to review its weight bands.',

  // Master data
  SIZE_BAND_NOT_FOUND: 'Size band not found.',
  SIZE_BAND_RANGE_INVALID: 'minWeightKg must be less than maxWeightKg.',
  SIZE_BAND_IN_USE: 'This size band is referenced by pets or service tiers — deactivate it instead.',

  // Users & RBAC
  USER_NOT_FOUND: 'User not found.',
  ROLE_NOT_FOUND: 'Role not found.',
  PERMISSION_NOT_FOUND: 'Permission not found.',

  // Services
  SERVICE_NOT_FOUND: 'Service not found.',
  SERVICE_TIER_NOT_FOUND: 'Service tier not found.',

  // Staff & time off
  STAFF_NOT_FOUND: 'Staff profile not found.',
  STAFF_PROFILE_EXISTS: 'This user already has a staff profile.',
  WORKING_HOURS_OVERLAP: 'Working hours cannot overlap on the same weekday.',
  TIME_OFF_NOT_FOUND: 'Time off not found.',
  TIME_OFF_RANGE_INVALID: 'Time off requires a valid startsAt and endsAt range.',

  // Availability
  AVAILABILITY_DATE_INVALID: 'date must be in YYYY-MM-DD format.',

  // Shop settings
  SHOP_SETTING_NOT_FOUND: 'Shop setting not found.',
  SHOP_SETTING_VALUE_REQUIRED: 'Setting value is required.',
  SHOP_SETTING_VALUE_INVALID: 'Setting value must be valid JSON.',

  // Validation
  PRICE_INVALID: 'priceThb must be a non-negative amount with up to 2 decimals',

  // Bookings
  BOOKING_NOT_FOUND: 'Booking not found.',
  BOOKING_SLOT_UNAVAILABLE: 'The requested time slot is not available.',
  BOOKING_SLOT_MISALIGNED: 'startsAt must land on the booking slot grid.',
  BOOKING_TOO_SOON: 'This time is too soon — pick a later slot.',
  BOOKING_STATUS_TRANSITION_INVALID: 'This status change is not allowed from the current status.',
  BOOKING_CUTOFF_PASSED: 'The cancellation window for this booking has passed.',
  BOOKING_ALREADY_PAID: 'This booking is already marked as paid.',
  BOOKING_CANCELLED_UNPAYABLE: 'A cancelled booking cannot be marked as paid.',

  // Auth
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_TAKEN: 'An account with this email already exists.',
  UNAUTHENTICATED: 'Authentication required.',
  INVALID_TOKEN: 'Invalid or expired token.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  OTP_INVALID: 'That code is incorrect or has expired. Request a new one.',
  OTP_TOO_MANY_ATTEMPTS: 'Too many incorrect attempts. Request a new code.',
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
