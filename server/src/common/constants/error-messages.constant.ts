/** Centralized user-facing error messages — import instead of inlining strings. */
export const ErrorMessages = {
  // Generic (Prisma translation layer)
  UNIQUE_CONFLICT: 'A record with this unique value already exists.',
  RECORD_NOT_FOUND: 'Record not found.',
  RELATED_RECORD_MISSING: 'Related record does not exist.',

  // Pets
  PET_NOT_FOUND: 'Pet not found.',
  PET_SIZE_INVALID: 'Pet size does not exist or is inactive.',

  // Services
  SERVICE_NOT_FOUND: 'Service not found.',
  SERVICE_TIER_NOT_FOUND: 'Service tier not found.',

  // Shop settings
  SHOP_SETTING_NOT_FOUND: 'Shop setting not found.',
  SHOP_SETTING_VALUE_REQUIRED: 'Setting value is required.',
  SHOP_SETTING_VALUE_INVALID: 'Setting value must be valid JSON.',

  // Validation
  PRICE_INVALID: 'priceThb must be a non-negative amount with up to 2 decimals',
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;
