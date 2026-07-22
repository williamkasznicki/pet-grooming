import argon2 from 'argon2';

/**
 * Argon2id with salt + pepper (docs/AUTH.md):
 * - Salt: random per password, generated and embedded in the hash by argon2 automatically.
 * - Pepper: server-wide secret from PASSWORD_PEPPER (env, never in the DB). Passed as
 *   argon2's `secret` option — a DB dump alone is not enough to attack the hashes.
 *
 * Changing the pepper invalidates every stored hash (users must reset passwords),
 * so treat it like a root credential.
 */
function pepper(): Buffer | undefined {
  const value = process.env.PASSWORD_PEPPER;
  return value ? Buffer.from( value, 'utf8' ) : undefined;
}

export function hashPassword ( plain: string ): Promise<string> {
  const secret = pepper();
  return argon2.hash( plain, secret ? { secret } : {} );
}

export function verifyPassword ( hash: string, plain: string ): Promise<boolean> {
  const secret = pepper();
  return argon2.verify( hash, plain, secret ? { secret } : {} );
}
