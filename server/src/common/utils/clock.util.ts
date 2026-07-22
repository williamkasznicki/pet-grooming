/**
 * The ONLY place the current time is read (API-CONVENTIONS.md). Everything
 * else imports now() — one seam to mock in tests, one place to audit.
 * Date math on the returned value goes through date-fns, never operators.
 */
export function now(): Date {
  return new Date();
}
