/**
 * Reproduce _signUrl(path) from the missav frontend JavaScript:
 *   1) Build "/{databaseId}{path}?frontend_timestamp=UNIX"
 *   2) HMAC-SHA1 that string with the public token (as text)
 *   3) Append &frontend_sign=hexdigest
 *
 * @param path - The API path to sign (e.g. "/search/users/anonymous/items/")
 * @returns The signed path string with frontend_timestamp and frontend_sign
 */
export declare function signPath(path: string): string;
//# sourceMappingURL=signer.d.ts.map