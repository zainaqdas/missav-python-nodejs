import type { AxiosInstance } from 'axios';
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
export declare class CloudflareFetcher {
    private http;
    private context;
    private contextPromise;
    private profileDir;
    private pythonScriptPath;
    constructor(http: AxiosInstance);
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
    fetch(url: string): Promise<string>;
    /** Clean up resources (Playwright browser context). */
    close(): Promise<void>;
    /**
     * Fetch HTML using Python's curl_cffi library with Chrome TLS
     * impersonation. This bypasses Cloudflare without a full browser.
     */
    private fetchWithPython;
    /**
     * Fetch HTML using Playwright headless Chromium with stealth measures.
     * Uses a persistent browser context (real profile) to look like a
     * genuine browser installation.
     */
    private fetchWithPlaywright;
    /** Get or create reusable persistent browser context. */
    private getContext;
}
//# sourceMappingURL=fetcher.d.ts.map