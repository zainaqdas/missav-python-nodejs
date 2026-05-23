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
const os_1 = __importDefault(require("os"));
const playwright_1 = require("playwright");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
/** Stealth script injected into Playwright pages before navigation. */
const STEALTH_SCRIPT = `
Object.defineProperty(navigator, 'webdriver', { get: () => false, configurable: false });
Object.defineProperty(navigator, 'plugins', {
  get: () => [
    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
    { name: 'Native Client', filename: 'internal-nacl-plugin' },
  ],
  configurable: false,
});
Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en'],
  configurable: false,
});
if (!window.chrome) { window.chrome = { runtime: {} }; }
`;
/**
 * Fetcher that tries multiple strategies in order of preference:
 *
 * 1. **Python curl_cffi bridge** (primary) — TLS impersonation bypasses
 *    Cloudflare without needing a full browser. Reliable and fast (~1-2s).
 * 2. **Axios** (fallback) — used when Python is not available.
 * 3. **Playwright** (last resort) — headless Chromium with stealth measures.
 *
 * IMPORTANT: Python curl_cffi is tried FIRST because making a plain HTTP
 * request (axios) to a Cloudflare-protected site flags the IP, making
 * subsequent TLS impersonation requests also fail. Going straight to
 * Python means Cloudflare sees the real Chrome TLS fingerprint on the
 * very first request and lets us through.
 */
class CloudflareFetcher {
    http;
    context = null;
    contextPromise = null;
    profileDir = null;
    pythonScriptPath;
    constructor(http) {
        this.http = http;
        // The Python helper script lives next to this TypeScript source file.
        // At runtime (compiled to dist/), __dirname points to dist/, so we
        // resolve relative to the project root: __dirname/../src/
        this.pythonScriptPath = path_1.default.resolve(__dirname, '..', 'src', 'fetcher_helper.py');
    }
    // ── Public API ──────────────────────────────────────────────────────
    /**
     * Fetch HTML from a URL.
     * Tries: Python bridge (primary) → axios → Playwright
     *
     * We try Python first because making a plain HTTP request (axios) to a
     * Cloudflare-protected site causes the IP to be flagged, which then
     * causes the Python bridge (TLS impersonation) to also fail. By going
     * straight to Python, Cloudflare sees the real Chrome TLS fingerprint
     * on the very first request and lets us through.
     */
    async fetch(url) {
        // Try Python bridge FIRST
        try {
            return await this.fetchWithPython(url);
        }
        catch {
            // Python unavailable — fall back to axios
        }
        // Try axios (fallback when Python is not available)
        try {
            const response = await this.http.get(url, {
                responseType: 'text',
                transformResponse: [(data) => data],
                timeout: 15_000,
            });
            const html = response.data;
            if (html.includes('Just a moment')) {
                return await this.fetchWithPlaywright(url);
            }
            return html;
        }
        catch (err) {
            const axiosErr = err;
            const isCloudflareBlock = axiosErr?.response?.status === 403 ||
                (typeof axiosErr?.response?.data === 'string' &&
                    axiosErr.response.data.includes('Just a moment'));
            if (isCloudflareBlock) {
                return await this.fetchWithPlaywright(url);
            }
            // For non-Cloudflare errors, try Playwright as last resort
            try {
                return await this.fetchWithPlaywright(url);
            }
            catch {
                throw err; // Rethrow original error
            }
        }
    }
    /** Clean up resources (Playwright browser context). */
    async close() {
        if (this.context) {
            await this.context.close().catch(() => { });
            this.context = null;
        }
        if (this.profileDir) {
            try {
                fs_1.default.rmSync(this.profileDir, { recursive: true, force: true });
            }
            catch { /* best-effort */ }
            this.profileDir = null;
        }
    }
    // ── Python curl_cffi Bridge ─────────────────────────────────────────
    /**
     * Fetch HTML using Python's curl_cffi library with Chrome TLS
     * impersonation. This bypasses Cloudflare without a full browser.
     */
    async fetchWithPython(url) {
        const scriptPath = this.pythonScriptPath;
        const result = await execFileAsync('python3', [scriptPath, url], {
            timeout: 45_000,
            maxBuffer: 1024 * 1024 * 10, // 10 MB max output
        });
        const stdout = result.stdout;
        // Cloudflare challenge pages contain the text "Just a moment"
        // in the HTML body. Legitimate pages never have this string.
        if (stdout.includes('Just a moment')) {
            throw new Error('Python fetcher received Cloudflare challenge page');
        }
        return stdout;
    }
    // ── Playwright Fallback ──────────────────────────────────────────────
    /**
     * Fetch HTML using Playwright headless Chromium with stealth measures.
     * Uses a persistent browser context (real profile) to look like a
     * genuine browser installation.
     */
    async fetchWithPlaywright(url) {
        const context = await this.getContext();
        const page = await context.newPage();
        try {
            await page.addInitScript(STEALTH_SCRIPT);
            await page.goto(url, {
                waitUntil: 'load',
                timeout: 30_000,
            });
            // Poll until Cloudflare challenge resolves (or timeout)
            const maxWait = Date.now() + 35_000;
            let content = await page.content();
            while (content.includes('Just a moment') &&
                Date.now() < maxWait) {
                await new Promise((r) => setTimeout(r, 500));
                content = await page.content();
            }
            if (content.includes('Just a moment')) {
                throw new Error('Cloudflare challenge could not be resolved via any method.\n' +
                    'Options:\n' +
                    '  1. Install curl_cffi for Python: pip3 install curl-cffi\n' +
                    '  2. Use a residential proxy (pass to Client config)\n' +
                    '  3. Use client.search() which works via Recombee API');
            }
            return content;
        }
        finally {
            await page.close().catch(() => { });
        }
    }
    /** Get or create reusable persistent browser context. */
    async getContext() {
        if (this.context && this.context.browser()?.isConnected()) {
            return this.context;
        }
        if (this.contextPromise) {
            return this.contextPromise;
        }
        this.contextPromise = (async () => {
            this.profileDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'missav-pw-'));
            try {
                this.context = await playwright_1.chromium.launchPersistentContext(this.profileDir, {
                    headless: true,
                    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' +
                        '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                    locale: 'en-US',
                    timezoneId: 'America/New_York',
                    viewport: { width: 1920, height: 1080 },
                    bypassCSP: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-blink-features=AutomationControlled',
                    ],
                });
                return this.context;
            }
            catch (err) {
                throw new Error(`Failed to launch Playwright Chromium. ` +
                    `Run: npx playwright install chromium\n` +
                    `Error: ${err.message}`);
            }
            finally {
                this.contextPromise = null;
            }
        })();
        return this.contextPromise;
    }
}
exports.CloudflareFetcher = CloudflareFetcher;
//# sourceMappingURL=fetcher.js.map