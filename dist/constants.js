"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIMEOUT = exports.DEFAULT_CACHE_TTL = exports.DEFAULT_MAX_WORKERS = exports.DEFAULT_SEARCH_COUNT = exports.DEFAULT_HEADERS = exports.PUBLIC_TOKEN = exports.DATABASE_ID = exports.BASE_HOST = void 0;
/** Recombee API host for missav search */
exports.BASE_HOST = 'client-rapi-missav.recombee.com';
/** Recombee database ID */
exports.DATABASE_ID = 'missav-default';
/** Public API token for HMAC signing */
exports.PUBLIC_TOKEN = 'Ikkg568nlM51RHvldlPvc2GzZPE9R4XGzaH9Qj4zK9npbbbTly1gj9K4mgRn0QlV';
/** Default HTTP headers for web scraping */
exports.DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Cache-Control': 'no-cache',
};
/** Default search result page size */
exports.DEFAULT_SEARCH_COUNT = 50;
/** Maximum concurrent workers for resolving video details */
exports.DEFAULT_MAX_WORKERS = 10;
/** Default cache TTL in milliseconds (5 minutes) */
exports.DEFAULT_CACHE_TTL = 5 * 60 * 1000;
/** Default request timeout in seconds */
exports.DEFAULT_TIMEOUT = 30;
//# sourceMappingURL=constants.js.map