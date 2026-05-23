"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const axios_1 = __importDefault(require("axios"));
const cache_1 = require("./cache");
const video_1 = require("./video");
const fetcher_1 = require("./fetcher");
const signer_1 = require("./signer");
const constants_1 = require("./constants");
/**
 * Parse a proxy URL string into host and port for axios.
 */
function parseProxyUrl(proxyUrl) {
    try {
        const url = new URL(proxyUrl);
        const result = {
            host: url.hostname,
            port: parseInt(url.port, 10) || 8080,
        };
        if (url.username) {
            result.auth = {
                username: url.username,
                password: url.password,
            };
        }
        return result;
    }
    catch {
        return null;
    }
}
/**
 * Main client for the missAV API.
 * Provides methods to fetch video metadata and search for videos.
 */
class Client {
    http;
    cache;
    fetcher;
    config;
    constructor(config = {}) {
        this.config = {
            timeout: config.timeout ?? constants_1.DEFAULT_TIMEOUT,
            userAgent: config.userAgent ?? constants_1.DEFAULT_HEADERS['User-Agent'] ?? 'Mozilla/5.0',
            proxy: config.proxy ?? '',
            cache: config.cache ?? true,
            cacheTtl: config.cacheTtl ?? constants_1.DEFAULT_CACHE_TTL,
            debug: config.debug ?? false,
        };
        this.cache = this.config.cache ? new cache_1.Cache(this.config.cacheTtl) : new cache_1.Cache(0);
        const axiosConfig = {
            timeout: this.config.timeout * 1000,
            headers: {
                'User-Agent': this.config.userAgent,
                ...constants_1.DEFAULT_HEADERS,
            },
        };
        // Handle proxy configuration
        if (this.config.proxy) {
            const parsed = parseProxyUrl(this.config.proxy);
            if (parsed) {
                axiosConfig.proxy = parsed;
            }
        }
        this.http = axios_1.default.create(axiosConfig);
        this.fetcher = new fetcher_1.CloudflareFetcher(this.http);
    }
    /**
     * Fetch a video by its missAV URL.
     *
     * @param url - The full video URL (e.g. https://missav.ws/en/fc2-ppv-123456)
     */
    async getVideo(url) {
        return new video_1.Video(url, this.fetcher, this.cache);
    }
    /**
     * Search for videos on missAV using the Recombee API.
     * Returns an async generator of Video objects.
     *
     * @param query - The search term
     * @param options - Search options (videoCount, maxWorkers)
     */
    async *search(query, options = {}) {
        const videoCount = options.videoCount ?? constants_1.DEFAULT_SEARCH_COUNT;
        const maxWorkers = options.maxWorkers ?? constants_1.DEFAULT_MAX_WORKERS;
        const path = '/search/users/anonymous/items/';
        const signedPath = (0, signer_1.signPath)(path);
        const url = `https://${constants_1.BASE_HOST}${signedPath}`;
        const body = {
            searchQuery: query,
            count: videoCount,
            cascadeCreate: true,
            returnProperties: true,
        };
        this.log('Searching for:', query);
        const response = await this.http.post(url, body, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
        });
        const data = response.data;
        const recomms = data.recomms ?? [];
        this.log(`Found ${recomms.length} results`);
        // Build video URLs from recommendation IDs
        const videoUrls = recomms.map((video) => `https://missav.ws/en/${video.id}`);
        // Fetch video details concurrently with limited concurrency
        const batches = [];
        for (let i = 0; i < videoUrls.length; i += maxWorkers) {
            batches.push(videoUrls.slice(i, i + maxWorkers));
        }
        for (const batch of batches) {
            const promises = batch.map(async (url) => {
                try {
                    return await this.getVideo(url);
                }
                catch (err) {
                    this.log(`Failed to fetch video ${url}:`, err);
                    return null;
                }
            });
            const resolved = await Promise.all(promises);
            for (const video of resolved) {
                if (video) {
                    yield video;
                }
            }
        }
    }
    /** Convenience: get video attributes directly without interacting with the Video object. */
    async getVideoAttributes(url) {
        const video = await this.getVideo(url);
        return video.getAllAttributes();
    }
    /** Clean up the fetcher's browser instance. */
    async close() {
        await this.fetcher.close();
    }
    log(...args) {
        if (this.config.debug) {
            console.log('[missAV]', ...args);
        }
    }
}
exports.Client = Client;
//# sourceMappingURL=client.js.map