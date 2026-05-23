import crypto from 'node:crypto';
import { DATABASE_ID, PUBLIC_TOKEN } from './constants';

/**
 * Reproduce _signUrl(path) from the missav frontend JavaScript:
 *   1) Build "/{databaseId}{path}?frontend_timestamp=UNIX"
 *   2) HMAC-SHA1 that string with the public token (as text)
 *   3) Append &frontend_sign=hexdigest
 *
 * @param path - The API path to sign (e.g. "/search/users/anonymous/items/")
 * @returns The signed path string with frontend_timestamp and frontend_sign
 */
export function signPath(path: string): string {
  const ts = Math.floor(Date.now() / 1000);
  const separator = path.includes('?') ? '&' : '?';
  const unsigned = `/${DATABASE_ID}${path}${separator}frontend_timestamp=${ts}`;

  const signature = crypto
    .createHmac('sha1', PUBLIC_TOKEN)
    .update(unsigned, 'utf-8')
    .digest('hex');

  return `${unsigned}&frontend_sign=${signature}`;
}
