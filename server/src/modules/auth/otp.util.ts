import { createHash, randomInt } from 'node:crypto';

/**
 * One-time codes for email 2FA and password reset (docs/AUTH.md).
 * Codes are 6 digits, delivered by email, and stored ONLY as a sha256 hash —
 * a DB dump never reveals a usable code. Short lived (see OTP_TTL_MINUTES).
 */
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

/** Cryptographically-random 6-digit code, e.g. "042317" (leading zeros kept). */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
