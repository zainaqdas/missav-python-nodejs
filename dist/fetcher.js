"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareFetcher = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
/**
 * Resolve the path to `fetcher_helper.py`.
 *
 * When the missav-api package is loaded from `node_modules/` (via
 * serverExternalPackages in Next.js), `__dirname` correctly points to
 * `dist/` inside the package, so we resolve up one level to find `src/`.
 *
 * When Next.js bundles the code, `__dirname` points into `.next/server/`
 * and the relative path fails. We fall back to `process.cwd()` to find
 * the script relative to the project root (the frontend/ directory).
 */
function resolvePythonScript() {
    // Primary: resolved relative to this file's dist/ location
    const fromDist = path_1.default.resolve(__dirname, '..', 'src', 'fetcher_helper.py');
    if (fs_1.default.existsSync(fromDist)) {
        return fromDist;
    }
    // Fallback 1: relative to the working directory (Next.js bundled)
    const fromCwd = path_1.default.resolve(process.cwd(), 'src', 'fetcher_helper.py');
    if (fs_1.default.existsSync(fromCwd)) {
        return fromCwd;
    }
    // Fallback 2: up one level from working directory (e.g. frontend/ -> project root)
    const fromCwdParent = path_1.default.resolve(process.cwd(), '..', 'src', 'fetcher_helper.py');
    if (fs_1.default.existsSync(fromCwdParent)) {
        return fromCwdParent;
    }
    // Fallback 3: from frontend/node_modules/missav-api/src/
    const fromNodeModules = path_1.default.resolve(process.cwd(), 'node_modules', 'missav-api', 'src', 'fetcher_helper.py');
    if (fs_1.default.existsSync(fromNodeModules)) {
        return fromNodeModules;
    }
    // Last resort: return the dist-relative path (will fail with clear error at runtime)
    return fromDist;
}
const PYTHON_SCRIPT = resolvePythonScript();
/**
 * Fetcher that uses Python's curl_cffi library for Chrome TLS
 * impersonation. This bypasses Cloudflare without needing a full
 * browser — fast and reliable (~1-2s per request).
 *
 * Why curl_cffi and not axios/Playwright?
 * - Axios makes plain HTTP requests that get instantly blocked by
 *   Cloudflare's JS challenge.
 * - Playwright requires a full Chromium download (~400MB) and is
 *   slow to launch (~5-10s) even before the page loads.
 * - Python's curl_cffi impersonates the real Chrome TLS stack at
 *   the libcurl level — Cloudflare sees the authentic fingerprint
 *   on the very first request and lets us through. Fast, no
 *   browser needed.
 */
class CloudflareFetcher {
    constructor() { }
    /**
     * Fetch HTML from a URL using Python's curl_cffi with Chrome TLS
     * impersonation. This is the only strategy — it works reliably
     * and is fast (~1-2s).
     */
    async fetch(url) {
        try {
            const result = await execFileAsync('python3', [PYTHON_SCRIPT, url], {
                timeout: 30_000,
                maxBuffer: 1024 * 1024 * 10, // 10 MB max output
            });
            const html = result.stdout;
            if (html.includes('Just a moment')) {
                throw new Error('Cloudflare challenge page received. This may resolve on retry.');
            }
            return html;
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(`Failed to fetch page: ${message}\n` +
                `Ensure Python 3 and curl_cffi are installed: pip3 install curl-cffi`);
        }
    }
    /** No-op — no browser resources to clean up. */
    async close() {
        // No-op
    }
}
exports.CloudflareFetcher = CloudflareFetcher;
//# sourceMappingURL=fetcher.js.map