"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPath = signPath;
const node_crypto_1 = __importDefault(require("node:crypto"));
const constants_1 = require("./constants");
/**
 * Reproduce _signUrl(path) from the missav frontend JavaScript:
 *   1) Build "/{databaseId}{path}?frontend_timestamp=UNIX"
 *   2) HMAC-SHA1 that string with the public token (as text)
 *   3) Append &frontend_sign=hexdigest
 *
 * @param path - The API path to sign (e.g. "/search/users/anonymous/items/")
 * @returns The signed path string with frontend_timestamp and frontend_sign
 */
function signPath(path) {
    const ts = Math.floor(Date.now() / 1000);
    const separator = path.includes('?') ? '&' : '?';
    const unsigned = `/${constants_1.DATABASE_ID}${path}${separator}frontend_timestamp=${ts}`;
    const signature = node_crypto_1.default
        .createHmac('sha1', constants_1.PUBLIC_TOKEN)
        .update(unsigned, 'utf-8')
        .digest('hex');
    return `${unsigned}&frontend_sign=${signature}`;
}
//# sourceMappingURL=signer.js.map