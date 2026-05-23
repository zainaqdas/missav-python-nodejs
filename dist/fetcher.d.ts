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
export declare class CloudflareFetcher {
    constructor();
    /**
     * Fetch HTML from a URL using Python's curl_cffi with Chrome TLS
     * impersonation. This is the only strategy — it works reliably
     * and is fast (~1-2s).
     */
    fetch(url: string): Promise<string>;
    /** No-op — no browser resources to clean up. */
    close(): Promise<void>;
}
//# sourceMappingURL=fetcher.d.ts.map